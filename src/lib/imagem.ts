// Fotografias: reduz e comprime em JPEG antes de guardar (cabe na cópia JSON).
export const LADO_MAXIMO = 1280;
export const QUALIDADE_JPEG = 0.72;

/** Dimensões finais mantendo a proporção, com o lado maior ≤ max. */
export function dimensoesAlvo(largura: number, altura: number, max = LADO_MAXIMO): { largura: number; altura: number } {
  const f = Math.min(1, max / Math.max(largura, altura));
  return { largura: Math.round(largura * f), altura: Math.round(altura * f) };
}

/** Lê uma imagem (câmara ou galeria) e devolve um data URL JPEG comprimido. */
export async function comprimirImagem(ficheiro: Blob): Promise<string> {
  const bitmap = await createImageBitmap(ficheiro); // respeita a orientação EXIF
  const { largura, altura } = dimensoesAlvo(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', QUALIDADE_JPEG);
}
