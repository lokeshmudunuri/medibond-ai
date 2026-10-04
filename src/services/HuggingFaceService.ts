import { GGUFModelMetadata, QuantizationVariant } from '../types/model';

export interface HFModelSummary {
  id: string; // e.g. "ggml-org/Qwen3-0.6B-GGUF"
  author: string;
  downloads: number;
  likes: number;
  lastModified: string;
  tags: string[];
  description?: string;
  gated?: boolean;
}

export interface HFModelDetail extends HFModelSummary {
  files: HFFileDetail[];
}

export interface HFFileDetail {
  filename: string;
  sizeBytes: number;
  downloadUrl: string;
  quantization: string;
  isRecommended?: boolean;
}

export class HuggingFaceService {
  private static readonly BASE_URL = 'https://huggingface.co/api';

  /**
   * Search for GGUF model repositories on Hugging Face
   */
  public static async searchModels(query: string): Promise<HFModelSummary[]> {
    try {
      const q = encodeURIComponent(query.trim());
      const url = `${this.BASE_URL}/models?search=${q}&filter=gguf&limit=15&full=false`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CareBondAI-Mobile/1.0' },
      });

      if (!response.ok) {
        throw new Error(`HF search returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        id: item.id || item.modelId || '',
        author: item.author || (item.id ? item.id.split('/')[0] : 'unknown'),
        downloads: item.downloads || 0,
        likes: item.likes || 0,
        lastModified: item.lastModified || '',
        tags: item.tags || [],
        description: item.description || `${item.id} (GGUF Model)`,
      }));
    } catch (err: any) {
      console.warn('[HuggingFaceService] Search failed:', err?.message || err);
      return [];
    }
  }

  /**
   * Inspect a model repo and extract available GGUF quantization files
   */
  public static async inspectModelRepo(repoId: string): Promise<HFModelDetail | null> {
    try {
      const url = `${this.BASE_URL}/models/${repoId}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CareBondAI-Mobile/1.0' },
      });

      if (!response.ok) {
        throw new Error(`HF model inspect returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const siblings: Array<{ rfilename: string; size?: number }> = data.siblings || [];
      const ggufFiles: HFFileDetail[] = [];

      for (const sib of siblings) {
        const name = sib.rfilename;
        if (name.toLowerCase().endsWith('.gguf')) {
          const quant = this.extractQuantization(name);
          const isRec = quant.includes('Q4_0') || quant.includes('Q4_K_M') || quant.includes('Q4_K');
          const size = sib.size || this.estimateSizeFromFilename(name);

          ggufFiles.push({
            filename: name,
            sizeBytes: size,
            downloadUrl: `https://huggingface.co/${repoId}/resolve/main/${name}`,
            quantization: quant,
            isRecommended: isRec,
          });
        }
      }

      // Sort files: recommended Q4 first, then by size
      ggufFiles.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.sizeBytes - b.sizeBytes;
      });

      return {
        id: data.id || repoId,
        author: data.author || repoId.split('/')[0],
        downloads: data.downloads || 0,
        likes: data.likes || 0,
        lastModified: data.lastModified || '',
        tags: data.tags || [],
        description: data.description || `${repoId} GGUF Quantizations`,
        files: ggufFiles,
      };
    } catch (err: any) {
      console.warn('[HuggingFaceService] Model inspection failed:', err?.message || err);
      return null;
    }
  }

  /**
   * Helper to parse quantization string from GGUF filenames
   */
  public static extractQuantization(filename: string): string {
    const upper = filename.toUpperCase();
    if (upper.includes('Q4_K_M')) return 'Q4_K_M';
    if (upper.includes('Q4_K_S')) return 'Q4_K_S';
    if (upper.includes('Q4_0')) return 'Q4_0';
    if (upper.includes('Q4_1')) return 'Q4_1';
    if (upper.includes('Q5_K_M')) return 'Q5_K_M';
    if (upper.includes('Q5_K_S')) return 'Q5_K_S';
    if (upper.includes('Q5_0')) return 'Q5_0';
    if (upper.includes('Q6_K')) return 'Q6_K';
    if (upper.includes('Q8_0') || upper.includes('Q8_K')) return 'Q8_0';
    if (upper.includes('BF16')) return 'BF16';
    if (upper.includes('F16') || upper.includes('FP16')) return 'F16';
    if (upper.includes('Q2_K')) return 'Q2_K';
    if (upper.includes('Q3_K_M')) return 'Q3_K_M';
    if (upper.includes('Q3_K_S')) return 'Q3_K_S';
    return 'GGUF';
  }

  private static estimateSizeFromFilename(filename: string): number {
    const upper = filename.toUpperCase();
    if (upper.includes('0.5B') || upper.includes('0.6B')) {
      if (upper.includes('Q4')) return 429 * 1024 * 1024;
      if (upper.includes('Q8')) return 805 * 1024 * 1024;
      return 600 * 1024 * 1024;
    }
    if (upper.includes('1.1B') || upper.includes('1.5B')) {
      if (upper.includes('Q4')) return 670 * 1024 * 1024;
      return 1100 * 1024 * 1024;
    }
    if (upper.includes('2B') || upper.includes('2.5B')) {
      if (upper.includes('Q4')) return 1400 * 1024 * 1024;
      return 2200 * 1024 * 1024;
    }
    return 500 * 1024 * 1024;
  }
}
