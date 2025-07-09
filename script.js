async function loadNotes() {
  const noteFiles = [
    'notes/note1.md',
    'notes/note2.md',
    'notes/note3.md',
    'notes/note4.md',
    'notes/note5.md'
  ];
  const notes = [];
  for (const file of noteFiles) {
    const res = await fetch(file);
    const text = await res.text();
    const note = parseFrontMatter(text);
    notes.push(note);
  }
  return notes;
}

function parseFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  let i = 0;
  const meta = {};
  if (lines[i] === '---') {
    i++;
    while (i < lines.length && lines[i] !== '---') {
      const line = lines[i];
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        if (key === 'tags') {
          meta[key] = value.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
        } else {
          meta[key] = value;
        }
      }
      i++;
    }
    i++; // skip closing ---
  }
  const content = lines.slice(i).join('\n');
  meta.content = content;
  return meta;
}

function markdownToHtml(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');
}

function createCard(note) {
  const card = document.createElement('div');
  card.className = 'card';
  const html = `
    <h3>${note.title}</h3>
    <p class="date">${note.date}</p>
    <p>${note.summary}</p>
  `;
  card.innerHTML = html;
  return card;
}

function updateGrid(notes) {
  const grid = document.getElementById('notesGrid');
  grid.innerHTML = '';
  notes.forEach(note => {
    grid.appendChild(createCard(note));
  });
}

function filterBySearch(notes, term) {
  term = term.toLowerCase();
  return notes.filter(n =>
    n.title.toLowerCase().includes(term) ||
    n.content.toLowerCase().includes(term) ||
    n.tags.some(t => t.toLowerCase().includes(term))
  );
}

function filterByDate(notes, year) {
  if (year === 'all') return notes;
  return notes.filter(n => n.date.startsWith(year));
}

function populateTimeline(notes) {
  const select = document.getElementById('timelineFilter');
  const years = Array.from(new Set(notes.map(n => n.date.slice(0,4))));
  years.sort();
  years.forEach(y => {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    select.appendChild(option);
  });
}

function generateTagGraph(notes) {
  const tagPairs = {};
  const tags = new Set();
  notes.forEach(n => {
    n.tags.forEach(t => tags.add(t));
    for (let i = 0; i < n.tags.length; i++) {
      for (let j = i + 1; j < n.tags.length; j++) {
        const pair = [n.tags[i], n.tags[j]].sort().join('|');
        tagPairs[pair] = (tagPairs[pair] || 0) + 1;
      }
    }
  });
  const svg = document.getElementById('tagSvg');
  const w = svg.getAttribute('width');
  const h = svg.getAttribute('height');
  const radius = Math.min(w, h) / 2 - 40;
  const centerX = w / 2;
  const centerY = h / 2;
  const tagArray = Array.from(tags);
  svg.innerHTML = '';
  tagArray.forEach((tag, index) => {
    const angle = (index / tagArray.length) * Math.PI * 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 20);
    circle.setAttribute('fill', '#81c784');
    svg.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = tag;
    svg.appendChild(text);
  });
  Object.keys(tagPairs).forEach(pair => {
    const [a, b] = pair.split('|');
    const ia = tagArray.indexOf(a);
    const ib = tagArray.indexOf(b);
    const angleA = (ia / tagArray.length) * Math.PI * 2;
    const angleB = (ib / tagArray.length) * Math.PI * 2;
    const x1 = centerX + radius * Math.cos(angleA);
    const y1 = centerY + radius * Math.sin(angleA);
    const x2 = centerX + radius * Math.cos(angleB);
    const y2 = centerY + radius * Math.sin(angleB);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#555');
    svg.insertBefore(line, svg.firstChild);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  const notes = await loadNotes();
  notes.forEach(n => {
    n.summary = markdownToHtml(n.content.split('\n')[0]);
  });
  populateTimeline(notes);
  generateTagGraph(notes);
  updateGrid(notes);

  document.getElementById('searchBox').addEventListener('input', (e) => {
    const term = e.target.value;
    const year = document.getElementById('timelineFilter').value;
    const filtered = filterByDate(filterBySearch(notes, term), year);
    updateGrid(filtered);
  });

  document.getElementById('timelineFilter').addEventListener('change', (e) => {
    const year = e.target.value;
    const term = document.getElementById('searchBox').value;
    const filtered = filterByDate(filterBySearch(notes, term), year);
    updateGrid(filtered);
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
  });
});
