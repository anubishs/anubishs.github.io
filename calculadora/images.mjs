export async function prepareReference(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha imagens JPG, PNG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter até 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Imagem inválida.');
    const ratio = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = .82, data;
    do { data = canvas.toDataURL('image/jpeg', quality); quality -= .1; } while (data.length > 400000 && quality > .2);
    if (data.length > 450000) throw new Error('Esta imagem é muito detalhada. Escolha uma versão menor.');
    return {id: crypto.randomUUID(), name: file.name.slice(0,200), caption:'', data, width:canvas.width, height:canvas.height};
  } catch (error) {
    if (error instanceof DOMException) throw new Error('Não foi possível abrir a imagem. Tente outro arquivo.');
    throw error;
  } finally { URL.revokeObjectURL(url); }
}
