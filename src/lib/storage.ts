import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export type UploadMeta = {
  originalFilename: string;
  mimeType: string;
  folder?: string;
};

export type StorageResult = {
  key: string;
  size: number;
};

export interface StorageAdapter {
  put(file: Buffer, meta: UploadMeta): Promise<StorageResult>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor() {
    this.basePath = process.env.UPLOAD_PATH || "./uploads";
  }

  async put(file: Buffer, meta: UploadMeta): Promise<StorageResult> {
    const folder = meta.folder || "resources";
    const dir = path.join(this.basePath, folder);
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${sanitizeFilename(meta.originalFilename)}`;
    const key = path.join(folder, filename).replace(/\\/g, "/");
    await writeFile(path.join(this.basePath, key), file);
    return { key, size: file.length };
  }

  async get(key: string): Promise<Buffer> {
    const safe = key.replace(/\.\./g, "");
    return readFile(path.join(this.basePath, safe));
  }

  async delete(key: string): Promise<void> {
    const safe = key.replace(/\.\./g, "");
    try {
      await unlink(path.join(this.basePath, safe));
    } catch {
      // ignore missing
    }
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    adapter = new LocalStorageAdapter();
  }
  return adapter;
}
