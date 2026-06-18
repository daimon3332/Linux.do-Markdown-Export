// ==UserScript==
// @name         Linux.do Markdown 导出器
// @namespace    https://linux.do/
// @version      1.1.0
// @description  导出 linux.do 帖子为 Markdown 格式
// @match        https://linux.do/t/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.__linuxdoExporterLoaded) return;
  window.__linuxdoExporterLoaded = true;

  const CONFIG = {
    id: 'ld-export',
    batchSize: 20,
  };

  const state = { busy: false, menuOpen: false };

  // ========== URL 解析 ==========
  function getTopicId() {
    const match = location.pathname.match(/\/t\/[^/]+\/(\d+)/);
    if (!match) throw new Error('无法解析帖子ID');
    return Number(match[1]);
  }

  // ========== API 请求 ==========
  async function fetchTopic(topicId) {
    const res = await fetch(`/t/${topicId}.json`, { credentials: 'include' });
    if (!res.ok) throw new Error(`获取帖子失败: ${res.status}`);
    const data = await res.json();
    if (!data?.post_stream) throw new Error('帖子数据格式异常');
    return data;
  }

  async function fetchPostsByIds(topicId, postIds) {
    if (!postIds.length) return [];
    const params = postIds.map(id => `post_ids[]=${id}`).join('&');
    const res = await fetch(`/t/${topicId}/posts.json?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`加载帖子失败: ${res.status}`);
    const data = await res.json();
    return data.post_stream?.posts || [];
  }

  async function fetchAllPosts(topicId, onProgress) {
    const topic = await fetchTopic(topicId);
    const allPostIds = topic.post_stream.stream || [];
    const initialPosts = topic.post_stream.posts || [];
    const loadedIds = new Set(initialPosts.map(p => p.id));
    const allPosts = [...initialPosts];

    const unloadedIds = allPostIds.filter(id => !loadedIds.has(id));
    const totalBatches = Math.ceil(unloadedIds.length / CONFIG.batchSize);

    for (let i = 0; i < unloadedIds.length; i += CONFIG.batchSize) {
      const batch = unloadedIds.slice(i, i + CONFIG.batchSize);
      const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
      onProgress?.(`加载帖子 ${batchNum}/${totalBatches}`);

      const posts = await fetchPostsByIds(topicId, batch);
      allPosts.push(...posts);
    }

    allPosts.sort((a, b) => a.post_number - b.post_number);
    return { topic, posts: allPosts };
  }

  // ========== HTML → Markdown ==========
  function sanitizeDom(root) {
    root.querySelectorAll('script,style,noscript,.avatar,.topic-avatar,.poster-avatar').forEach(n => n.remove());
    // 移除 emoji 图片
    root.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const alt = img.getAttribute('alt') || '';
      // 过滤条件：emoji 路径 或 alt 是 :xxx: 格式（自定义表情）
      if (src.includes('/images/emoji/') || src.includes('/emoji/') || /^:[a-zA-Z0-9_]+:$/.test(alt)) {
        img.remove();
        return;
      }
      const lazy = img.getAttribute('data-src') || img.getAttribute('data-original');
      if (lazy) img.setAttribute('src', lazy);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
    });
    // 处理 lightbox 链接：移除尺寸信息文字
    root.querySelectorAll('a.lightbox, a[data-download-href]').forEach(a => {
      const img = a.querySelector('img');
      if (img) {
        // 只保留图片，移除其他文本节点
        [...a.childNodes].forEach(node => {
          if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node !== img && !node.contains(img))) {
            node.remove();
          }
        });
      }
    });
  }

  function resolveUrl(src) {
    if (!src || src.startsWith('data:')) return src;
    try { return new URL(src, location.origin).href; } catch { return src; }
  }

  function escapeText(s) {
    return s.replace(/\\/g, '\\\\').replace(/[*_\[\]<>]/g, c => '\\' + c);
  }

  function htmlToMd(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeText(node.nodeValue || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node;
    const tag = el.tagName.toLowerCase();
    const children = () => [...el.childNodes].map(n => htmlToMd(n)).join('');

    switch (tag) {
      case 'br': return '\n';
      case 'hr': return '\n---\n';
      case 'img': {
        const src = resolveUrl(el.getAttribute('src') || '');
        const alt = el.getAttribute('alt') || '';
        return `![${escapeText(alt)}](${src})`;
      }
      case 'a': {
        // 如果链接包含图片，直接输出图片（使用链接的 href 作为图片源，通常是原图）
        const img = el.querySelector('img');
        if (img) {
          const href = resolveUrl(el.getAttribute('href') || '');
          const alt = img.getAttribute('alt') || '';
          const src = href || resolveUrl(img.getAttribute('src') || '');
          return `![${escapeText(alt)}](${src})`;
        }
        const href = resolveUrl(el.getAttribute('href') || '');
        const text = children().trim() || href;
        return href ? `[${text}](${href})` : text;
      }
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
          return '`' + (el.textContent || '') + '`';
        }
        return el.textContent || '';
      case 'pre': {
        const code = el.querySelector('code');
        const text = (code || el).textContent || '';
        const lang = code?.className.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${lang}\n${text.replace(/\n+$/, '')}\n\`\`\`\n`;
      }
      case 'strong': case 'b': return `**${children()}**`;
      case 'em': case 'i': return `*${children()}*`;
      case 'p': return children().trim() + '\n\n';
      case 'blockquote': {
        const inner = children().trim().split('\n').map(l => '> ' + l).join('\n');
        return inner + '\n\n';
      }
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = parseInt(tag[1]);
        return '#'.repeat(level) + ' ' + children().trim() + '\n\n';
      }
      case 'ul': case 'ol': {
        const isOl = tag === 'ol';
        const items = [...el.children].filter(c => c.tagName.toLowerCase() === 'li');
        return items.map((li, i) => {
          const marker = isOl ? `${i + 1}. ` : '- ';
          const content = [...li.childNodes].map(n => htmlToMd(n)).join('').trim();
          return marker + content;
        }).join('\n') + '\n\n';
      }
      default: return children();
    }
  }

  function normalizeMd(md) {
    return md.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function parseCooked(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    sanitizeDom(doc.body);
    return doc.body;
  }

  // ========== 导出逻辑 ==========
  async function exportMarkdown(includeComments) {
    const topicId = getTopicId();
    setStatus('获取帖子...');

    const { topic, posts } = await fetchAllPosts(topicId, setStatus);
    const title = topic.title || `帖子 ${topicId}`;
    const url = `https://linux.do/t/${topicId}`;

    setStatus('转换内容...');
    const mainPost = posts[0];
    const mainMd = normalizeMd(htmlToMd(parseCooked(mainPost.cooked)));

    let result = `# ${title}\n${url}\n\n${mainMd}`;

    if (includeComments && posts.length > 1) {
      result += '\n\n---\n\n';
      const comments = posts.slice(1);

      for (let i = 0; i < comments.length; i++) {
        if (i % 50 === 0) setStatus(`转换评论 ${i + 1}/${comments.length}`);
        const post = comments[i];
        const md = normalizeMd(htmlToMd(parseCooked(post.cooked)));
        result += `@${post.username}: ${md}\n\n`;
      }
    }

    const filename = `${title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)}-${topicId}${includeComments ? '-full' : ''}.md`;
    downloadFile(filename, result);
    setStatus(`导出完成 (${posts.length} 条)`);
  }

  function downloadFile(name, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ========== UI ==========
  function setStatus(text) {
    const el = document.getElementById(`${CONFIG.id}-status`);
    if (el) el.textContent = text || '';
  }

  function setBusy(busy) {
    state.busy = busy;
    document.querySelectorAll(`#${CONFIG.id}-menu button`).forEach(b => b.disabled = busy);
  }

  function toggleMenu() {
    state.menuOpen = !state.menuOpen;
    const menu = document.getElementById(`${CONFIG.id}-menu`);
    if (menu) menu.style.display = state.menuOpen ? 'block' : 'none';
  }

  function closeMenu() {
    state.menuOpen = false;
    const menu = document.getElementById(`${CONFIG.id}-menu`);
    if (menu) menu.style.display = 'none';
  }

  async function handleExport(includeComments) {
    closeMenu();
    setBusy(true);
    try {
      await exportMarkdown(includeComments);
    } catch (e) {
      console.error(e);
      setStatus('错误: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function mountUI() {
    if (document.getElementById(`${CONFIG.id}-root`)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${CONFIG.id}-root{position:fixed;right:20px;top:50%;transform:translateY(-50%);z-index:999999;font-family:system-ui,-apple-system,sans-serif}
      #${CONFIG.id}-fab{width:48px;height:48px;border:none;border-radius:50%;background:#2563eb;color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:transform .15s}
      #${CONFIG.id}-fab:hover{transform:scale(1.05);background:#1d4ed8}
      #${CONFIG.id}-menu{display:none;position:absolute;top:50%;right:56px;transform:translateY(-50%);background:#1f2937;border-radius:12px;padding:8px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
      #${CONFIG.id}-menu button{width:100%;padding:10px 12px;border:none;border-radius:8px;background:#374151;color:#f3f4f6;cursor:pointer;text-align:left;font-size:14px;margin-bottom:6px}
      #${CONFIG.id}-menu button:last-of-type{margin-bottom:0}
      #${CONFIG.id}-menu button:hover{background:#4b5563}
      #${CONFIG.id}-menu button:disabled{opacity:.5;cursor:not-allowed}
      #${CONFIG.id}-status{margin-top:8px;font-size:12px;color:#9ca3af;text-align:center}
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = `${CONFIG.id}-root`;
    root.innerHTML = `
      <button id="${CONFIG.id}-fab" title="导出 Markdown">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </button>
      <div id="${CONFIG.id}-menu">
        <button id="${CONFIG.id}-post">导出帖子</button>
        <button id="${CONFIG.id}-all">导出帖子 + 评论</button>
        <div id="${CONFIG.id}-status"></div>
      </div>
    `;
    document.body.appendChild(root);

    document.getElementById(`${CONFIG.id}-fab`).onclick = (e) => { e.stopPropagation(); toggleMenu(); };
    document.getElementById(`${CONFIG.id}-menu`).onclick = (e) => e.stopPropagation();
    document.getElementById(`${CONFIG.id}-post`).onclick = () => handleExport(false);
    document.getElementById(`${CONFIG.id}-all`).onclick = () => handleExport(true);
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
  }

  mountUI();
})();
