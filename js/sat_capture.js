/** Transparent Blockly PNG export. No workspace mutation or external service. */
window.SatCapture = (() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let busy = false;
  const properties = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'font-family',
    'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline',
    'letter-spacing', 'paint-order', 'visibility', 'display'];

  function notify(message) {
    if (window.SatFiles && window.SatFiles.showDriverToast) window.SatFiles.showDriverToast(message);
    else window.alert(message);
  }

  function copyAppearance(source, copy) {
    const originals = [source, ...source.querySelectorAll('*')];
    const copies = [copy, ...copy.querySelectorAll('*')];
    originals.forEach((element, index) => {
      const style = getComputedStyle(element);
      for (const property of properties) copies[index].style.setProperty(property, style.getPropertyValue(property));
      // Transient selection/drag outlines are editor UI, not program content.
      copies[index].classList.remove('blocklySelected', 'blocklyDragging', 'blocklyHighlighted');
    });
  }

  async function embedImages(svg) {
    for (const img of svg.querySelectorAll('image')) {
      const href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (!href || href.startsWith('data:')) continue;
      const response = await fetch(new URL(href, document.baseURI));
      if (!response.ok) throw new Error('Não foi possível carregar uma imagem dos blocos.');
      const blob = await response.blob();
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      img.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      img.setAttribute('href', data);
    }
  }

  async function createPng(workspace) {
    if (!workspace || !workspace.getTopBlocks(false).length) throw new Error('Adicione blocos antes de capturar.');
    if (document.fonts) await document.fonts.ready;
    const source = workspace.getCanvas();
    if (!source || !source.getClientRects().length) throw new Error('Abra a aba Blocos para capturar.');
    const bounds = source.getBBox();
    if (!bounds.width || !bounds.height) throw new Error('Não há blocos visíveis para capturar.');
    const margin = 16;
    const width = Math.ceil(bounds.width + margin * 2);
    const height = Math.ceil(bounds.height + margin * 2);
    // Keep large projects within practical browser canvas limits.
    const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(16000000 / (width * height)));
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `${bounds.x - margin} ${bounds.y - margin} ${width} ${height}`);
    const owner = source.ownerSVGElement;
    if (owner) owner.querySelectorAll('defs').forEach(defs => svg.appendChild(defs.cloneNode(true)));
    const blocks = source.cloneNode(true);
    copyAppearance(source, blocks);
    blocks.removeAttribute('transform'); // Remove viewport zoom/pan, retain block positions.
    blocks.style.removeProperty('transform');
    svg.appendChild(blocks);
    await embedImages(svg);
    const serialized = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([serialized], {type: 'image/svg+xml;charset=utf-8'}));
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Não foi possível renderizar os blocos.'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('O navegador não conseguiu criar a imagem.');
      // A fresh canvas is transparent; never paint a background rectangle.
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Não foi possível gerar o PNG.'));
      }, 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function capture() {
    if (busy) return;
    busy = true;
    const button = document.getElementById('btnCaptureBlocks');
    if (button) button.disabled = true;
    try {
      const workspace = window.SatBlocksApp && window.SatBlocksApp.getWorkspace();
      const blob = await createPng(workspace);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `satblocks-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notify('PNG dos blocos gerado com fundo transparente.');
    } catch (error) {
      console.error('[CAPTURA]', error);
      notify(error.message || 'Falha ao capturar os blocos.');
    } finally {
      busy = false;
      if (button) button.disabled = false;
    }
  }

  function init() {
    const button = document.getElementById('btnCaptureBlocks');
    if (button) button.addEventListener('click', capture);
    document.addEventListener('keydown', event => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey || event.code !== 'KeyE') return;
      if (event.repeat || event.isComposing) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
      const area = document.getElementById('blocklyDiv');
      if (!area || !area.getClientRects().length) return;
      event.preventDefault();
      event.stopPropagation();
      capture();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  return {capture, createPng};
})();
