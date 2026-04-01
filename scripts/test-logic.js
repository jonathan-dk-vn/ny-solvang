// scripts/test-logic.js
const wordMap = new Map();
// Giả lập từ điển
wordMap.set('loại', { className: 'hl-verb' }); // Giả sử loại có trong từ điển
wordMap.set('i', { className: 'hl-prep' });
wordMap.set('have', { className: 'hl-verb' });
wordMap.set('jeg', { className: 'hl-pron' });
wordMap.set('bor', { className: 'hl-verb' });

// Giả lập Homographs
const HOMOGRAPHS = new Set(['i', 'have', 'loại']); // Giả sử 'loại' cũng bị trùng (để test)

const DANISH_WORD_REGEX = /([\p{L}0-9]+)/gu;

function testHighlight(text) {
    console.log(`\n--- Testing: "${text}" ---`);
    
    // Tách câu
    const sentences = text.match(/[^.?!]+(?:[.?!]+["']?|$)/g) || [text];
    
    sentences.forEach(sentence => {
        const tokens = sentence.match(DANISH_WORD_REGEX) || [];
        // Check Context
        const isDanishContext = tokens.some(token => {
            const lower = token.toLowerCase();
            const inMap = wordMap.has(lower);
            const isHomograph = HOMOGRAPHS.has(lower);
            // Log logic check cho từng từ
            // console.log(`   Word: ${lower} | InMap: ${inMap} | IsHomograph: ${isHomograph}`);
            return inMap && !isHomograph;
        });

        console.log(`   > Sentence: "${sentence.trim()}" => IsDanishContext: ${isDanishContext}`);
        
        // Simulate Replace
        const result = sentence.replace(DANISH_WORD_REGEX, (match) => {
            const lower = match.toLowerCase();
            if (wordMap.has(lower)) {
                 const isHomograph = HOMOGRAPHS.has(lower);
                 if (isDanishContext || !isHomograph) {
                     return `[HIGHLIGHT:${match}]`;
                 }
            }
            return match;
        });
        console.log(`   > Result:   ${result.trim()}`);
    });
}

// TEST CASES
testHighlight("Loại từ (Ordklasse)"); // Mong đợi: Không highlight "Loại" (nếu nó không có trong wordMap, hoặc nếu có mà là homograph thì context=false)
testHighlight("I have a pen.");       // Mong đợi: Không highlight "I", "have"
testHighlight("Jeg bor i Danmark.");  // Mong đợi: Highlight "Jeg", "bor", "i" (vì có Jeg/bor xác định ngữ cảnh)