"""Actual two-repository, real-FFmpeg Blender -> Toaster Pantry handoff smoke."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path


def png(path: Path, rgb: tuple[int, int, int]) -> None:
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


def run(blender_repo: Path) -> dict:
    blender_repo = blender_repo.expanduser().resolve(strict=True)
    sys.path.insert(0, str(blender_repo))
    from haunted_blender import catalog, alchemy
    from haunted_blender.pantry_exchange import export_alchemy

    node = shutil.which("node")
    ffmpeg = shutil.which("ffmpeg")
    if not node or not ffmpeg:
        raise RuntimeError("Cross-project smoke needs installed Node and FFmpeg")
    toaster_cli = Path(__file__).with_name("import-blender-exchange.cjs")

    with tempfile.TemporaryDirectory(prefix="nuklear-exchange-e2e-") as temp:
        base = Path(temp)
        blender_home = catalog.init(base / "blender-home")
        photos = base / "photos"
        photos.mkdir()
        png(photos / "cup.png", (195, 60, 30))
        png(photos / "moon.png", (35, 85, 190))
        assert catalog.scan(blender_home, photos)["indexed_or_changed"] == 2
        con = catalog.connect(blender_home)
        try:
            identities = {Path(row["path"]).stem: row["id"]
                          for row in con.execute("SELECT id,path FROM assets")}
        finally:
            con.close()

        recipe = alchemy.create(blender_home, identities["cup"], identities["moon"],
                                relation="shape-echo", statement="An artist-proposed shared silhouette")
        snapshot = alchemy.freeze(blender_home, recipe["id"])
        original_video = base / "blender-home" / "renders" / "alchemy.mp4"
        alchemy.render(blender_home, snapshot, original_video)
        original_receipt = original_video.with_suffix(".mp4.receipt.json")
        original_manifest = base / "blender-home" / "renders" / "alchemy.exchange.json"
        export_alchemy(blender_home, snapshot, original_video, original_manifest)

        # Simulate a different machine: the producer receipt still refers to original_video,
        # but the consumer only uses these three explicit transferred local files.
        transfer = base / "transfer"
        transfer.mkdir()
        video = transfer / "renamed.mp4"
        receipt = transfer / "producer-receipt.json"
        manifest = transfer / "exchange.json"
        shutil.copyfile(original_video, video)
        shutil.copyfile(original_receipt, receipt)
        shutil.copyfile(original_manifest, manifest)
        toaster_home = base / "toaster-home"
        command = [
            node, str(toaster_cli), "--toaster-home", str(toaster_home),
            "--manifest", str(manifest), "--receipt", str(receipt), "--video", str(video),
        ]
        output = subprocess.run(command, text=True, capture_output=True, check=True)
        admitted = json.loads(output.stdout)
        catalogue = json.loads((toaster_home / "VSPantry/catalog/video-pantry.v1.json").read_text())
        assert len(catalogue["specimens"]) == 1
        assert catalogue["specimens"][0]["specimenId"] == admitted["specimenId"]
        actual_sha = hashlib.sha256(video.read_bytes()).hexdigest()
        assert catalogue["specimens"][0]["sourceSha256"] == actual_sha
        recipe_digest = admitted["proposalRecipeId"].split(":")[-1]
        proposal = json.loads((toaster_home / "VSPantry/recipes/v1" / (recipe_digest + ".json")).read_text())
        assert proposal["ingredients"][0]["specimenId"] == admitted["specimenId"]
        assert proposal["authority"] == "proposal-only"
        exchange = json.loads(Path(admitted["exchangeEntryPath"]).read_text())
        assert exchange["producerRecipeId"] == recipe["id"]
        assert exchange["renderAuthority"] == "none"

        subprocess.run(command, text=True, capture_output=True, check=True)
        assert len(json.loads((toaster_home / "VSPantry/catalog/video-pantry.v1.json").read_text())["specimens"]) == 1
        video.write_bytes(video.read_bytes() + b"modified")
        refused = subprocess.run(command, text=True, capture_output=True)
        assert refused.returncode != 0 and "video bytes do not match" in refused.stderr
        return {
            "actualBlenderMp4": True,
            "transferredPathDifferent": True,
            "receiptAndVideoVerified": True,
            "toasterSpecimenId": admitted["specimenId"],
            "proposalRecipeId": admitted["proposalRecipeId"],
            "reimportIdempotent": True,
            "modifiedVideoRefused": True,
            "toasterRenderPerformed": False,
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender-repo", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(run(args.blender_repo), indent=2))


if __name__ == "__main__":
    main()
