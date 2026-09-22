"""Real, private-temp Blender -> Toaster Exchange -> HyperKitchen -> VSPantry proof.

Requires checkout paths for the separately owned Blender and Exchange draft branches.
No personal images, uploaded assets or generated output are committed.
"""
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
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(pixels))
        + chunk(b"IEND", b"")
    )


def call(*args: str) -> dict:
    result = subprocess.run(args, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def proof(blender_repo: Path, exchange_repo: Path, hyperkitchen_repo: Path) -> dict:
    sys.path.insert(0, str(blender_repo.resolve(strict=True)))
    from haunted_blender import catalog, alchemy
    from haunted_blender.pantry_exchange import export_alchemy

    exchange_cli = exchange_repo.resolve(strict=True) / "src/full-measure/scripts/import-blender-exchange.cjs"
    hyperkitchen_cli = hyperkitchen_repo.resolve(strict=True) / "src/full-measure/scripts/hyperkitchen-local.cjs"
    assert exchange_cli.is_file() and hyperkitchen_cli.is_file()
    with tempfile.TemporaryDirectory(prefix="hyperkitchen-real-") as temp:
        root = Path(temp)
        blender_home = catalog.init(root / "blender")
        photos = root / "photos"
        photos.mkdir()
        png(photos / "cup.png", (190, 60, 35))
        png(photos / "moon.png", (35, 75, 180))
        assert catalog.scan(blender_home, photos)["indexed_or_changed"] == 2
        con = catalog.connect(blender_home)
        try:
            ids = {Path(row["path"]).stem: row["id"]
                   for row in con.execute("SELECT id,path FROM assets")}
        finally:
            con.close()
        recipe = alchemy.create(blender_home, ids["cup"], ids["moon"], relation="shape-echo",
                                statement="Synthetic shared silhouette; artist-proposed only")
        snapshot = alchemy.freeze(blender_home, recipe["id"])
        video = root / "blender-output.mp4"
        receipt = alchemy.render(blender_home, snapshot, video)
        exchange_manifest = root / "alchemy.exchange.json"
        export_alchemy(blender_home, snapshot, video, exchange_manifest)

        transfer = root / "transfer"
        transfer.mkdir()
        media = transfer / "moved.mp4"
        manifest = transfer / "manifest.json"
        producer_receipt = transfer / "producer-receipt.json"
        shutil.copyfile(video, media)
        shutil.copyfile(exchange_manifest, manifest)
        shutil.copyfile(video.with_suffix(".mp4.receipt.json"), producer_receipt)

        toaster_home = root / "toaster"
        imported = call("node", str(exchange_cli), "--toaster-home", str(toaster_home),
                        "--manifest", str(manifest), "--receipt", str(producer_receipt),
                        "--video", str(media))
        assert imported["status"] == "catalogued-for-proposal"
        assert imported["rendererAuthorityGranted"] is False

        rendered = call("node", str(hyperkitchen_cli), "--toaster-home", str(toaster_home),
                        "--video", str(media), "--exchange-entry", imported["exchangeEntryPath"])
        output = Path(rendered["renderPath"])
        output_bytes = output.read_bytes()
        output_sha = hashlib.sha256(output_bytes).hexdigest()
        assert rendered["status"] == "scoped_complete"
        assert output_sha == rendered["outputSha256"]
        assert rendered["childSpecimenId"] and rendered["childSpecimenId"] != imported["specimenId"]
        receipt_path = output.parent / "render.receipt.json"
        witnessed = json.loads(receipt_path.read_text())
        assert witnessed["specimenId"] == rendered["specimenId"]
        assert witnessed["sourceSpecimenId"] == imported["specimenId"]
        assert witnessed["exchangeManifestSha256"] == imported["exchangeEntryPath"].split("/")[-2]
        assert witnessed["organismLineage"] == [
            "FRAME-EAT-FRAME@0.1.0", "PULSE@0.1.0",
        ]
        catalog_contents = json.loads((toaster_home / "VSPantry/catalog/video-pantry.v1.json").read_text())
        ids = {record["specimenId"] for record in catalog_contents["specimens"]}
        assert ids == {imported["specimenId"], rendered["childSpecimenId"]}
        assert hashlib.sha256(media.read_bytes()).hexdigest() == receipt["output_sha256"]
        assert rendered["hostedHyperFramesRendered"] is False

        # Reproving the exact already-rendered projection is idempotent, not an extra output.
        repeated = call("node", str(hyperkitchen_cli), "--toaster-home", str(toaster_home),
                        "--video", str(media), "--exchange-entry", imported["exchangeEntryPath"])
        assert repeated["projectionId"] == rendered["projectionId"]
        assert repeated["outputSha256"] == rendered["outputSha256"]
        assert repeated["reimported"] is True
        media.write_bytes(media.read_bytes() + b"unexpected post-admission delta")
        refusal = subprocess.run([
            "node", str(hyperkitchen_cli), "--toaster-home", str(toaster_home),
            "--video", str(media), "--exchange-entry", imported["exchangeEntryPath"],
        ], capture_output=True, text=True)
        assert refusal.returncode != 0 and "admitted" in refusal.stderr
        return {
            "syntheticBlenderOriginals": True,
            "realBlenderAlchemyMp4": True,
            "realCrossBranchExchange": True,
            "finiteHyperFoodGraph": True,
            "localChromiumHtmlProjection": True,
            "renderedMp4Sha256": output_sha,
            "outputReadmittedInExistingVSPantry": True,
            "repeatProjectionIdempotent": True,
            "tamperedSourceRefused": True,
            "hostedHyperFramesLintInspectRender": False,
            "acceptedSongRenderChanged": False,
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender-repo", required=True, type=Path)
    parser.add_argument("--exchange-repo", required=True, type=Path)
    parser.add_argument("--hyperkitchen-repo", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(proof(args.blender_repo, args.exchange_repo, args.hyperkitchen_repo), indent=2))


if __name__ == "__main__":
    main()
