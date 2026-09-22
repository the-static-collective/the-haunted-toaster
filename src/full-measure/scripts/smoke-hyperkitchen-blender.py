"""Real cross-application smoke: synthetic Blender alchemy -> Exchange -> HyperKitchen.

This test creates NO user media, uses only local synthetic PNGs, and exercises
the real FFmpeg + local Chromium execution path. It never calls hosted HyperFrames.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path


def image(path: Path, rgb: tuple[int, int, int]) -> None:
    width, height = 48, 32
    pixels = (b"\x00" + bytes(rgb) * width) * height

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(pixels))
        + chunk(b"IEND", b"")
    )


def call(args: list[str], *, env=None) -> dict:
    proc = subprocess.run(args, text=True, capture_output=True, env=env, check=True)
    return json.loads(proc.stdout)


def smoke(blender_repo: Path, exchange_repo: Path) -> dict:
    node = shutil.which("node")
    ffprobe = shutil.which("ffprobe")
    if not node or not shutil.which("ffmpeg") or not ffprobe:
        raise RuntimeError("HyperKitchen smoke needs Node, FFmpeg, FFprobe and installed Playwright Chromium")
    blender_repo = blender_repo.expanduser().resolve(strict=True)
    exchange_repo = exchange_repo.expanduser().resolve(strict=True)
    sys.path.insert(0, str(blender_repo))
    from haunted_blender import catalog, alchemy
    from haunted_blender.pantry_exchange import export_alchemy

    with tempfile.TemporaryDirectory(prefix="hyperkitchen-blender-e2e-") as temp:
        base = Path(temp)
        home = catalog.init(base / "blender-home")
        photos = base / "images"
        photos.mkdir()
        image(photos / "cup.png", (194, 48, 36))
        image(photos / "moon.png", (35, 75, 175))
        assert catalog.scan(home, photos)["indexed_or_changed"] == 2
        con = catalog.connect(home)
        try:
            ids = {Path(row["path"]).stem: row["id"]
                   for row in con.execute("SELECT id,path FROM assets")}
        finally:
            con.close()

        recipe = alchemy.create(home, ids["cup"], ids["moon"], relation="shape-echo",
                                statement="Synthetic visual shape relationship; artist proposal")
        snapshot = alchemy.freeze(home, recipe["id"])
        first = base / "blender.mp4"
        alchemy.render(home, snapshot, first)
        manifest = base / "blender.exchange.json"
        export_alchemy(home, snapshot, first, manifest)

        # Explicitly transfer the files to a different path to prove the receipt's
        # producer-local output_path is not followed by the consumer.
        moved = base / "transferred"
        moved.mkdir()
        video = moved / "clip.mp4"
        transferred_receipt = moved / "producer.receipt.json"
        transferred_manifest = moved / "producer.exchange.json"
        shutil.copyfile(first, video)
        shutil.copyfile(first.with_suffix(".mp4.receipt.json"), transferred_receipt)
        shutil.copyfile(manifest, transferred_manifest)
        toaster_home = base / "toaster-home"
        exchange_cli = exchange_repo / "src/full-measure/scripts/import-blender-exchange.cjs"
        imported = call([
            node, str(exchange_cli), "--toaster-home", str(toaster_home),
            "--video", str(video), "--manifest", str(transferred_manifest),
            "--receipt", str(transferred_receipt),
        ])
        assert imported["rendererAuthorityGranted"] is False
        events = moved / "events.json"
        events.write_text(json.dumps([
            {"tMs": 0, "strength": 1}, {"tMs": 500, "strength": 0.8},
        ]), encoding="utf-8")

        cli = Path(__file__).with_name("hyperkitchen-local.cjs")
        argv = [
            node, str(cli), "--toaster-home", str(toaster_home),
            "--video", str(video), "--exchange-entry", imported["exchangeEntryPath"],
            "--duration-ms", "1000", "--events", str(events),
        ]
        result = call(argv)
        output = Path(result["renderPath"])
        receipt = json.loads(output.with_name("render.receipt.json").read_text())
        assert receipt["status"] == "scoped_complete"
        assert receipt["specimenId"] == result["specimenId"]
        assert receipt["sourceSpecimenId"] == imported["specimenId"]
        assert receipt["exchangeManifestSha256"] == imported["exchangeEntryPath"].split("/")[-2]
        assert receipt["organismLineage"] == ["FRAME-EAT-FRAME@0.1.0", "PULSE@0.1.0"]
        assert hashlib.sha256(output.read_bytes()).hexdigest() == receipt["output"]["sha256"]
        assert receipt["output"]["sha256"] != hashlib.sha256(video.read_bytes()).hexdigest()
        assert result["childSpecimenId"] is not None
        assert receipt["adapter"] == "hyperframes-html-trace/v1"
        assert receipt["renderer"]["id"] == "local-chromium-offline/v1"
        assert not result["hostedHyperFramesRendered"]
        assert not result["grantsSongRenderAuthority"]
        assert (output.parent / "index.html").exists()
        assert (output.parent / "specimen.json").exists()
        assert (output.parent / "projection.json").exists()

        probe = call([ffprobe, "-v", "error", "-show_entries",
                      "stream=width,height,nb_frames:format=duration",
                      "-of", "json", str(output)])
        stream = next(s for s in probe["streams"] if "width" in s)
        assert stream["width"] == 320 and stream["height"] == 180
        assert int(stream["nb_frames"]) == 24
        catalog_path = toaster_home / "VSPantry/catalog/video-pantry.v1.json"
        state = json.loads(catalog_path.read_text())
        assert len(state["specimens"]) == 2
        assert {i["specimenId"] for i in state["specimens"]} == {
            imported["specimenId"], result["childSpecimenId"],
        }
        again = call(argv)
        assert again["reimported"] is True
        assert again["specimenId"] == result["specimenId"]
        assert len(json.loads(catalog_path.read_text())["specimens"]) == 2

        # A modified source must fail even when a finished projection is cached.
        video.write_bytes(video.read_bytes() + b"changed-source")
        refused = subprocess.run(argv, text=True, capture_output=True)
        assert refused.returncode != 0
        assert "requires this exact video path to be admitted" in refused.stderr
        return {
            "realBlenderVideo": True,
            "producerReceiptAndExchangeVerified": True,
            "hyperfoodOrganisms": receipt["organismLineage"],
            "htmlProjectionFrameCount": int(stream["nb_frames"]),
            "localChromiumFfmpegRendered": True,
            "childReAdmittedVSPantry": True,
            "idempotent": True,
            "modifiedSourceRefused": True,
            "hostedHyperFramesRendered": False,
        }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--blender-repo", required=True, type=Path)
    p.add_argument("--exchange-repo", required=True, type=Path)
    args = p.parse_args()
    print(json.dumps(smoke(args.blender_repo, args.exchange_repo), indent=2))


if __name__ == "__main__":
    main()
