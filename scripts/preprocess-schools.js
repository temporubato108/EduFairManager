const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', '전국초중등학교위치표준데이터.csv');
const outDir = path.join(__dirname, '..', 'lib', 'data');
const outPath = path.join(outDir, 'schools.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const buf = fs.readFileSync(csvPath);
const text = new TextDecoder('euc-kr').decode(buf);
const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

function extractRegion(addr) {
  if (!addr) return '';
  const clean = addr.trim();

  // Special handling for Jeju
  if (clean.includes('제주특별자치도') || clean.startsWith('제주')) {
    return '제주';
  }
  // Special handling for Sejong
  if (clean.includes('세종특별자치시') || clean.startsWith('세종')) {
    return '세종';
  }
  // Special & Metropolitan cities
  if (clean.startsWith('서울특별시') || clean.startsWith('서울')) return '서울';
  if (clean.startsWith('부산광역시') || clean.startsWith('부산')) return '부산';
  if (clean.startsWith('대구광역시') || clean.startsWith('대구')) return '대구';
  if (clean.startsWith('인천광역시') || clean.startsWith('인천')) return '인천';
  if (clean.startsWith('광주광역시') || clean.startsWith('광주')) return '광주';
  if (clean.startsWith('대전광역시') || clean.startsWith('대전')) return '대전';
  if (clean.startsWith('울산광역시') || clean.startsWith('울산')) return '울산';

  // Province-based addresses: e.g. '경기도 안성시...', '전라남도 순천시...', '경상남도 남해군...', '강원특별자치도 춘천시...'
  const tokens = clean.split(/\s+/);
  if (tokens.length >= 2) {
    const second = tokens[1];
    // e.g. 안성시 -> 안성, 곡성군 -> 곡성, 포항시 -> 포항
    if (second.endsWith('시') || second.endsWith('군') || second.endsWith('구')) {
      return second.replace(/(시|군|구)$/, '');
    }
    return second;
  }
  return tokens[0] || '';
}

const schoolMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = line.split(',');
  const name = (cols[1] || '').trim();
  const status = (cols[6] || '').trim();
  const addr = (cols[7] || cols[8] || '').trim();

  if (name && status === '운영') {
    const region = extractRegion(addr);
    const key = `${name}__${region}`;
    if (!schoolMap.has(key)) {
      schoolMap.set(key, { name, region });
    }
  }
}

const schoolList = Array.from(schoolMap.values()).sort((a, b) => {
  if (a.name !== b.name) return a.name.localeCompare(b.name, 'ko-KR');
  return a.region.localeCompare(b.region, 'ko-KR');
});

fs.writeFileSync(outPath, JSON.stringify(schoolList), 'utf8');
console.log(`Successfully generated ${schoolList.length} schools to ${outPath}`);
