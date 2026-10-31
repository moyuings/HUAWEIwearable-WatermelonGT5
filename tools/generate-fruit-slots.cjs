// Desktop-only: immutable keys avoid repeated native list reconstruction.
const fs = require('fs'), path = require('path');
const file = path.resolve(__dirname, '../entry/src/main/js/default/pages/game/game.hml');
let hml = fs.readFileSync(file, 'utf8');
const start = '    <!-- FRUIT SLOTS BEGIN -->', end = '    <!-- FRUIT SLOTS END -->';
const block = start + '\n    <image for="{{slotKeys}}" show="{{fruit($item).visible}}" src="{{fruit($item).src}}" style="left: {{fruit($item).x}}px; top: {{fruit($item).y}}px; width: {{fruit($item).size}}px; height: {{fruit($item).size}}px;"></image>\n' + end;
if (hml.includes(start)) hml = hml.slice(0, hml.indexOf(start)) + block + hml.slice(hml.indexOf(end) + end.length);
else hml = hml.replace(/    <!-- Iterate immutable keys[^]*?    <\/stack>/, block);
fs.writeFileSync(file, hml);
console.log('Generated 40 reusable image slots, hidden while inactive; zero per-fruit wrapper stacks.');
