import os
import zipfile
import subprocess

readelf = r"C:\Users\lokes\AppData\Local\Android\Sdk\ndk\28.2.13676358\toolchains\llvm\prebuilt\windows-x86_64\bin\llvm-readelf.exe"
apk_path = r"android/app/build/outputs/apk/debug/app-debug.apk"
extract_dir = r"scratch/apk_libs"

os.makedirs(extract_dir, exist_ok=True)

with zipfile.ZipFile(apk_path, 'r') as zip_ref:
    for member in zip_ref.namelist():
        if member.startswith("lib/arm64-v8a/") and member.endswith(".so"):
            zip_ref.extract(member, extract_dir)

print(f"{'SO File':<50} | {'Status':<20} | {'Alignments'}")
print("-" * 90)

so_dir = os.path.join(extract_dir, "lib", "arm64-v8a")
for f in sorted(os.listdir(so_dir)):
    if not f.endswith(".so"):
        continue
    so_path = os.path.join(so_dir, f)
    res = subprocess.run([readelf, "-l", so_path], capture_output=True, text=True)
    load_lines = [line for line in res.stdout.splitlines() if "LOAD" in line]
    aligns = []
    is_16kb = True
    for line in load_lines:
        parts = line.strip().split()
        if parts:
            align = parts[-1]
            aligns.append(align)
            if align not in ("0x4000", "0x10000", "16384", "65536"):
                is_16kb = False
    status = "[OK] 16-KB ALIGNED" if is_16kb else "[FAIL] 4-KB ALIGNED"
    print(f"{f:<50} | {status:<20} | {', '.join(aligns)}")
