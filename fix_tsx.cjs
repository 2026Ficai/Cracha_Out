const fs = require('fs');

const filePath = 'src/pages/ManualStudentsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Remove isLoadingDB and setIsPrinting
content = content.replace("  const [isLoadingDB, setIsLoadingDB] = useState(false);\n", "");
content = content.replace("  const [isPrinting, setIsPrinting] = useState(false);\n", "");

// Remove handleTourCallback
content = content.replace(/  const handleTourCallback = \([\s\S]*?localStorage\.setItem\('cracha_hasSeenTour', 'true'\);\n    }\n  };\n/, "");

// Remove loadFromDatabase
content = content.replace(/  const loadFromDatabase = async \(\) => {[\s\S]*?setIsLoadingDB\(false\);\n    }\n  };\n/, "");

// Clean up callback={handleTourCallback} if it exists
content = content.replace(/      callback={handleTourCallback}\n/g, "");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed ManualStudentsPage.tsx');
