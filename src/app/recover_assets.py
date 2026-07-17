import os

brain_dir = r"C:\Users\ACER\.gemini\antigravity-ide\brain"

for conv_dir in os.listdir(brain_dir):
    tasks_dir = os.path.join(brain_dir, conv_dir, ".system_generated", "tasks")
    if not os.path.exists(tasks_dir):
        continue
    for log_file in os.listdir(tasks_dir):
        log_path = os.path.join(tasks_dir, log_file)
        size = os.path.getsize(log_path)
        if size < 5000:
            continue
        with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        if 'AssetsPage' in content and 'backButton' in content:
            print(f"Found in: {conv_dir}/{log_file} ({size} bytes)")
            out_path = f"assets_log_{conv_dir[:8]}_{log_file}"
            with open(out_path, 'w', encoding='utf-8', errors='replace') as out:
                out.write(content)
            print(f"  Saved to {out_path}")

print("Done.")
