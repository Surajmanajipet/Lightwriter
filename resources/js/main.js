const { jsPDF } = window.jspdf;
const doc = new jsPDF();

const Size = Quill.import('formats/size');
Size.whitelist = ['small', false, 'large', 'huge'];
Quill.register(Size, true);

const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        toolbar: '#toolbar'
    }
});

let fileHandle = null;
let lastOpenedFile = null;
const editor = document.getElementById("editor");
const previewDiv = document.getElementById('preview');

async function loadLastOpenedFile() {
    try {
        const data = await Neutralino.storage.getData('lastOpenedFile');
        console.log('Loaded storage data:', data);

        const nameEl = document.getElementById('name');

        if (data) {
            const filePath = data;
            console.log('Trying to load file:', filePath);
            const fileContent = await Neutralino.filesystem.readFile(filePath);
            console.log('File content loaded:', fileContent);
            quill.setText(fileContent);
            fileHandle = filePath;

            // Extract and show file name
            const fileName = filePath.split(/[\/\\]/).pop();
            nameEl.textContent = fileName;
        } else {
            console.log('No last opened file stored, clearing editor');
            quill.setText('');
            fileHandle = null;
            nameEl.textContent = 'Untitled';
        }
    } catch (error) {
        const nameEl = document.getElementById('name');
        if (error.code === 'NE_ST_NOSTKEX') {
            console.log('No last opened file found, starting fresh.');
            quill.setText('');
            fileHandle = null;
            nameEl.textContent = 'Untitled';
        } else {
            console.error('Error loading last opened file:', error);
            nameEl.textContent = 'Untitled';
        }
    }
}

function updateAutosaveTime() {
    const autosave = document.getElementById('autosave');
    if (!autosave) return;

    if (fileHandle) {
        const timeStr = new Date().toLocaleTimeString();
        autosave.innerHTML = `Autosaved at ${timeStr}`;
        autosave.style.display = 'block';
    } else {
        autosave.innerHTML = '';
        autosave.style.display = 'none';
    }
}

window.onload = async () => {
    await Neutralino.init();
    await loadLastOpenedFile();
    updateAutosaveTime();

    document.getElementById("closeBtn").addEventListener("click", async () => {
        if (fileHandle) {
            await Neutralino.filesystem.writeFile(fileHandle, quill.getText());
            await Neutralino.storage.setData('lastOpenedFile', fileHandle);
        }
        Neutralino.app.exit();
    });

    // Autosave every 5 minutes
    setInterval(async () => {
        if (fileHandle) {
            try {
                await Neutralino.filesystem.writeFile(fileHandle, quill.getText());
                await Neutralino.storage.setData('lastOpenedFile', fileHandle);
                updateAutosaveTime();
                console.log('Autosaved at', new Date().toLocaleTimeString());
            } catch (err) {
                console.error('Autosave failed:', err);
            }
        } else {
            updateAutosaveTime(); // Hide autosave message
        }
    }, 300000); // 5 minutes
};

// New document
document.getElementById('newBtn').addEventListener('click', () => {
    if (confirm('Clear the editor and start a new document?')) {
        quill.setContents([]);
        fileHandle = null;
        lastOpenedFile = null;

        Neutralino.storage.setData('lastOpenedFile', null);

        const nameElem = document.getElementById('name');
        if (nameElem) {
            nameElem.textContent = 'Untitled';
        }

        updateAutosaveTime();
    }
});

// Open file
document.getElementById('openBtn').addEventListener('click', async () => {
    try {
        const result = await Neutralino.os.showOpenDialog('Open File', {
            filters: [{ name: 'Text Files', extensions: ['txt'] }],
            multiple: false
        });

        if (!result || !result[0]) return;

        const filePath = result[0];
        const fileData = await Neutralino.filesystem.readFile(filePath);
        quill.setText(fileData);

        fileHandle = filePath;
        lastOpenedFile = filePath;

        const nameElem = document.getElementById('name');
        if (nameElem) {
            nameElem.textContent = fileHandle.split(/[\\/]/).pop();
        }

        // Save immediately and update UI
        await Neutralino.filesystem.writeFile(fileHandle, quill.getText());
        await Neutralino.storage.setData('lastOpenedFile', fileHandle);

        updateAutosaveTime();
    } catch (err) {
        console.error('File open canceled or failed:', err);
    }
});

// Save file
document.getElementById('saveBtn').addEventListener('click', async () => {
    try {
        if (!fileHandle) {
            const result = await Neutralino.os.showSaveDialog('Save File', {
                filters: [{ name: 'Text Files', extensions: ['txt'] }],
                defaultPath: 'document.txt'
            });

            if (!result || typeof result !== 'string' || result.trim() === '') {
                console.error('Invalid file path returned from save dialog:', result);
                return;
            }

            fileHandle = result;
            if (!fileHandle.toLowerCase().endsWith('.txt')) {
                fileHandle += '.txt';
            }
        }

        await Neutralino.filesystem.writeFile(fileHandle, quill.getText());
        await Neutralino.storage.setData('lastOpenedFile', fileHandle);

        const nameElem = document.getElementById('name');
        if (nameElem) {
            nameElem.textContent = fileHandle.split(/[\\/]/).pop();
        }

        alert('File saved!');
        updateAutosaveTime();
    } catch (err) {
        console.error('Save failed or canceled:', err);
    }
});





document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

function onWindowClose() {
    Neutralino.app.exit();
}

if (typeof Neutralino !== 'undefined') {
    Neutralino.events.on("windowClose", onWindowClose);
}

// Your keyboard bindings & toggle function remain unchanged
quill.keyboard.addBinding({ key: 'L', shortKey: true }, () => {
    quill.format('align', '');
});
quill.keyboard.addBinding({ key: 'E', shortKey: true }, () => {
    quill.format('align', 'center');
});
quill.keyboard.addBinding({ key: 'R', shortKey: true }, () => {
    quill.format('align', 'right');
});
quill.keyboard.addBinding({ key: 'J', shortKey: true, }, () => {
    quill.format('align', 'justify');
});

document.getElementById('modeToggle').addEventListener('click', toggle);

function toggle() {
    const isEditorVisible = editor.style.display !== 'none';

    if (isEditorVisible) {
        let text = quill.getText();

        // Remove anything between // and //
        text = text.replace(/\/\/[\s\S]*?\/\//g, '').trim();
        const lines = text.split('\n');

        const margins = {
            top: 1,
            bottom: 1,
            left: 1.5,
            right: 1,
            characterX: 3.5,
            parentheticalX: 3.0,
            dialogueX: 2.5,
            dialogueRightMargin: 2.5,
        };
        margins.dialogueWidth = 8.5 - margins.dialogueX - margins.dialogueRightMargin;

        const doc = new jsPDF({
            unit: 'in',
            format: 'letter',
            lineHeight: 1.15,
            margins: { top: margins.top, bottom: margins.bottom, left: margins.left, right: margins.right }
        });

        const lineHeight = 12 / 72;
        const maxLinesPerPage = 55;
        const pageWidth = 8.5;
        const usableWidth = pageWidth - margins.left - margins.right;
        let y = margins.top;
        let lineCount = 0;

        doc.setFont('CourierPrime-Regular', 'normal');
        doc.setFontSize(12);

        const addPage = () => {
            doc.addPage();
            y = margins.top;
            lineCount = 0;
        };

        const addWrappedLines = (text, options = {}) => {
            if (!text.trim()) return;
            const {
                x = margins.left,
                bold = false,
                italic = false,
                align = 'left',
                maxWidth = usableWidth
            } = options;

            if (bold) {
                doc.setFont('CourierPrime-Bold', 'bold');  // your bold font registered as normal style
            } else if (italic) {
                doc.setFont('CourierPrime-Italic', 'italic'); // italic font registered as normal style
            } else {
                doc.setFont('CourierPrime-Regular', 'normal'); // regular font registered as normal style
            }
            const wrappedLines = doc.splitTextToSize(text, maxWidth);

            wrappedLines.forEach(line => {
                if (lineCount >= maxLinesPerPage) addPage();
                let adjustedX = x;
                if (align === 'center') adjustedX = (pageWidth - doc.getTextWidth(line)) / 2;
                else if (align === 'right') adjustedX = pageWidth - margins.right - doc.getTextWidth(line);

                doc.text(line, adjustedX, y);
                y += lineHeight;
                lineCount++;
            });
        };
        let i = 0;
        const metadata = [];
        let contact = '';
        let email = '';

        // Extract metadata until first blank line
        while (i < lines.length && lines[i].trim() !== '') {
            const line = lines[i].trim();

            if (line.startsWith("TITLE:")) {
                metadata.push({ type: 'TITLE', value: line.substring(6).trim() });
            } else if (line.startsWith("CREDIT:")) {
                metadata.push({ type: 'CREDIT', value: line.substring(7).trim() });
            } else if (line.startsWith("AUTHOR:")) {
                metadata.push({ type: 'AUTHOR', value: line.substring(7).trim() });
            } else if (line.startsWith("CONTACT:")) {
                contact = line.substring(8).trim();
            } else if (line.includes('@')) {
                email = line.substring(7).trim();
            }

            i++;
        }

        // Skip the blank line
        while (i < lines.length && lines[i].trim() === '') i++;

        // Remove metadata lines from the original lines array
        lines.splice(0, i);

        // === Insert metadata into the title page ===
        let yTitlePage = 4;
        doc.setFontSize(14);

        metadata.forEach(item => {
            if (item.type === 'TITLE') {
                doc.setFont('CourierPrime-Bold', 'bold');
            } else {
                doc.setFont('CourierPrime-Regular', 'normal');
            }
            doc.text(item.value, pageWidth / 2, yTitlePage, { align: 'center' });
            yTitlePage += 0.3;
        });

        // === Add contact and email at bottom-left ===
        doc.setFont('CourierPrime-Regular', 'normal');
        doc.setFontSize(12);

        let contactY = 10;
        if (contact) {
            doc.text(contact, margins.left, contactY);
            contactY += 0.2;
        }
        if (email) {
            doc.text(email, margins.left, contactY);
        }
        // Add a new page for the screenplay content after the title/meta page
        doc.addPage();

        // Reset y and lineCount for screenplay page
        y = margins.top;
        lineCount = 0;

        // Now continue with your existing screenplay rendering loop starting at line 'i' (which you already have)
        // -----------------------
        // Screenplay Rendering
        // -----------------------
        i = 0;
        while (i < lines.length) {
            let line = lines[i].trim();
            if (line === '') { i++; continue; }

            // Shorthand location (capital + ends with --)
            if (/^[A-Z\s]+--$/.test(line)) {
                addWrappedLines(line, { bold: true });
                y += lineHeight;
                lineCount++;
                i++;
                continue;
            }

            // Shot line: SHOT - description
            const shotMatch = line.match(/^([A-Z\s]+?)\s*-\s*(.+)$/);
            if (shotMatch) {
                const [_, shot, description] = shotMatch;
                const shotText = shot.trim().toUpperCase();
                const descriptionText = description.trim();

                // Only treat as shot if description is NOT all uppercase
                if (descriptionText !== descriptionText.toUpperCase()) {
                    const dash = ' - ';
                    // Set bold for shot
                    doc.setFont('CourierPrime-Bold', 'bold');
                    const shotAndDash = shotText + dash;
                    doc.text(shotAndDash, margins.left, y);

                    // Set normal for description
                    const shotWidth = doc.getTextWidth(shotAndDash);
                    doc.setFont('CourierPrime-Regular', 'normal');
                    doc.text(descriptionText, margins.left + shotWidth, y);

                    y += lineHeight;
                    lineCount++;

                    // Blank line after shot
                    y += lineHeight;
                    lineCount++;

                    i++;
                    continue;
                }
                // else: treat as character line (fall through)
            }



            if (/^(int|ext|int\/ext|ext\/int)\b/i.test(line)) {
                addWrappedLines(line.toUpperCase(), { bold: true });
                y += lineHeight;
                lineCount++;
                i++;
                continue;
            }

            if (line.endsWith(':') && line.toUpperCase() !== 'FADE IN:') {
                addWrappedLines(line, { align: 'right' });
                y += lineHeight;
                lineCount++;
                i++;
                continue;
            }

            if (line.toUpperCase() === 'FADE IN:') {
                addWrappedLines(line);
                y += lineHeight;
                lineCount++;
                i++;
                continue;
            }

            if (/^[A-Z\s\d()'.\-]+$/.test(line) && !/^(INT|EXT|INT\/EXT|EXT\/INT)/.test(line)) {
                addWrappedLines(line.toUpperCase(), {
                    x: margins.characterX,
                    bold: true,
                    maxWidth: pageWidth - margins.characterX - margins.right
                });
                i++;

                if (i < lines.length && /^\(.*\)$/.test(lines[i].trim())) {
                    if (lineCount + 2 > maxLinesPerPage) addPage();
                    addWrappedLines(lines[i].trim(), {
                        x: margins.parentheticalX,
                        italic: true,
                        maxWidth: pageWidth - margins.parentheticalX - margins.right
                    });
                    i++;
                }

                while (i < lines.length && lines[i].trim() !== '') {
                    addWrappedLines(lines[i].trim(), {
                        x: margins.dialogueX,
                        maxWidth: margins.dialogueWidth
                    });
                    i++;
                }

                y += lineHeight;
                lineCount++;

                while (i < lines.length && lines[i].trim() === '') i++;
                continue;
            }

            const actionLines = [];
            while (i < lines.length && lines[i].trim() !== '') {
                actionLines.push(lines[i].trim());
                i++;
            }

            actionLines.forEach(line => addWrappedLines(line));
            y += lineHeight;
            lineCount++;

            while (i < lines.length && lines[i].trim() === '') i++;
        }

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.src = URL.createObjectURL(doc.output('blob'));
        previewDiv.innerHTML = '';
        previewDiv.appendChild(iframe);

        editor.style.display = "none";
        document.getElementById('sidebar').style.display = "none";
        previewDiv.style.display = "block";
    } else {
        editor.style.display = "block";
        document.getElementById('sidebar').style.display = "block";
        previewDiv.style.display = "none";
    }
}
document.addEventListener('keydown', async function (event) {
    if (event.ctrlKey && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
            case 'n': // Ctrl+N => New file
                event.preventDefault();
                if (confirm('Clear the editor and start a new document?')) {
                    quill.setContents([]);
                    fileHandle = null;
                    lastOpenedFile = null;
                    Neutralino.storage.setData({ lastOpenedFile: null });  // Clear last opened file
                }
                break;

            case 'o': // Ctrl+O => Open file
                event.preventDefault();
                try {
                    const result = await Neutralino.os.showOpenDialog('Open File', {
                        filters: [{ name: 'Text Files', extensions: ['txt'] }],
                        multiple: false
                    });

                    if (!result || !result[0]) return;

                    const filePath = result[0];
                    const fileData = await Neutralino.filesystem.readFile(filePath);
                    quill.setText(fileData);

                    fileHandle = filePath;
                    lastOpenedFile = filePath;
                    await Neutralino.storage.setData({ lastOpenedFile: lastOpenedFile });
                } catch (err) {
                    console.error('File open canceled or failed:', err);
                }
                break;

            case 's': // Ctrl+S => Save file
                event.preventDefault();
                try {
                    if (!fileHandle) {
                        const result = await Neutralino.os.showSaveDialog('Save File', {
                            filters: [{ name: 'Text Files', extensions: ['txt'] }],
                            defaultPath: 'document.txt'
                        });
                        if (!result) return;  // User cancelled save dialog

                        if (typeof result !== 'string' || result.trim() === '') {
                            console.error('Invalid file path returned from save dialog:', result);
                            return;
                        }
                        fileHandle = result;

                        if (!fileHandle.toLowerCase().endsWith('.txt')) {
                            fileHandle += '.txt';
                        }
                        console.log('Writing file to:', fileHandle);
                        console.log('File content length:', quill.getText().length);

                        await Neutralino.filesystem.writeFile(fileHandle, quill.getText());

                        lastOpenedFile = fileHandle;
                        await Neutralino.storage.setData('lastOpenedFile', fileHandle);

                        alert('File saved!');
                    }
                    else {
                        console.log('Writing file to:', fileHandle);
                        console.log('File content length:', quill.getText().length);

                        await Neutralino.filesystem.writeFile(fileHandle, quill.getText());

                        lastOpenedFile = fileHandle;
                        await Neutralino.storage.setData('lastOpenedFile', fileHandle);

                        alert('Changes saved!');
                    }
                } catch (err) {
                    console.error('Save failed or canceled:', err);
                }
                break;
            case 'p':
                event.preventDefault();
                toggle()
            case 't':
                event.preventDefault();
                document.body.classList.toggle('dark-mode');
        }
    }
});
const sceneList = document.getElementById('sceneList');

// Assuming you already have a Quill editor instance initialized as `quill`
let script = {};

let typingTimer;

quill.on('text-change', (delta, oldDelta, source) => {
    if (source !== 'user') return;

    const text = quill.getText();
    const lines = text.split('\n');

    sceneList.innerHTML = '';
    script = {};

    let i = 0;
    let sceneIndex = 0;
    let currentScene = null;
    let charIndex = 0;

    // === Detect Metadata (stop if blank line or scene heading) ===
    let metadataLines = [];
    while (i < lines.length) {
        const trimmed = lines[i].trim();
        const isSceneHeading = /^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(trimmed);

        if (trimmed === '' || isSceneHeading) break;

        metadataLines.push(lines[i]);
        charIndex += lines[i].length + 1;
        i++;
    }
    if (metadataLines.length > 0) {
        script.metadata = metadataLines.join('\n');
        if (lines[i] === '') {
            charIndex += 1; // for the blank line
            i++; // Skip blank line after metadata
        }
    }

    // === Parse Scenes ===
    for (; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const isSceneHeading = /^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(trimmed);

        if (isSceneHeading) {
            currentScene = { heading: trimmed, content: [trimmed] };
            script[sceneIndex] = currentScene;

            // Bold the scene heading in editor
            quill.formatText(charIndex, line.length, { bold: true }, 'silent');

            // Add scene heading to sidebar
            const li = document.createElement('li');
            li.textContent = trimmed;
            li.dataset.index = sceneIndex;
            li.draggable = true;
            li.style.cursor = 'pointer';

            li.addEventListener('click', () => {
                const allLines = quill.getText().split('\n');
                let charIdx = 0;
                for (let j = 0; j < allLines.length; j++) {
                    if (allLines[j].trim() === trimmed) break;
                    charIdx += allLines[j].length + 1;
                }

                quill.setSelection(charIdx, 0, 'silent');

                const [blot] = quill.getLine(charIdx);
                if (blot && blot.domNode && blot.domNode.scrollIntoView) {
                    blot.domNode.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });

            sceneList.appendChild(li);
            sceneIndex++;
        } else if (currentScene) {
            currentScene.content.push(line);
        }

        charIndex += line.length + 1; // account for newline
    }

    // Only add the Jump to End button if there is at least one scene
    if (sceneIndex > 0) {
        const jumpBtn = document.createElement('button');
        jumpBtn.textContent = '➕ Jump to End';
        jumpBtn.style.marginTop = '10px';
        jumpBtn.style.padding = '5px 10px';
        jumpBtn.style.cursor = 'pointer';
        jumpBtn.style.width = '100%';
        jumpBtn.style.border = 'none';
        jumpBtn.style.background = '#f0f0f0';
        jumpBtn.style.fontWeight = 'bold';

        jumpBtn.addEventListener('click', () => {
            const endIndex = quill.getLength() - 1; // Last character index

            quill.setSelection(endIndex, 0, 'silent');

            const [blot] = quill.getLine(endIndex);
            if (blot && blot.domNode && blot.domNode.scrollIntoView) {
                blot.domNode.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        });
        sceneList.appendChild(jumpBtn);
    }
});


function parseScenes() {
    const text = quill.getText();
    const lines = text.split('\n');

    sceneList.innerHTML = '';
    script = {};

    let i = 0;
    let sceneIndex = 0;
    let currentScene = null;
    let charIndex = 0;

    // === Metadata ===
    let metadataLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
        metadataLines.push(lines[i]);
        charIndex += lines[i].length + 1;
        i++;
    }
    if (metadataLines.length > 0) {
        script.metadata = metadataLines.join('\n');
        if (lines[i] === '') {
            charIndex++;
            i++;
        }
    }

    // === Scenes ===
    let scenesFound = 0;
    for (; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const isSceneHeading = /^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(trimmed);

        if (isSceneHeading) {
            currentScene = { heading: trimmed, content: [trimmed] };
            script[sceneIndex] = currentScene;

            // Bold scene heading
            quill.formatText(charIndex, line.length, { bold: true }, 'silent');

            // Add to sidebar
            const li = document.createElement('li');
            li.textContent = trimmed;
            li.dataset.index = sceneIndex;
            li.draggable = true;
            li.style.cursor = 'pointer';

            li.addEventListener('click', () => {
                const allLines = quill.getText().split('\n');
                let charIdx = 0;
                for (let j = 0; j < allLines.length; j++) {
                    if (allLines[j].trim() === trimmed) break;
                    charIdx += allLines[j].length + 1;
                }
                quill.setSelection(charIdx, 0, 'silent');
                const [blot] = quill.getLine(charIdx);
                if (blot && blot.domNode?.scrollIntoView) {
                    blot.domNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            sceneList.appendChild(li);
            sceneIndex++;
            scenesFound++;
        } else if (currentScene) {
            currentScene.content.push(line);
        }

        charIndex += line.length + 1;
    }

    if (scenesFound > 0) {
        const jumpBtn = document.createElement('button');
        jumpBtn.textContent = '➕ Jump to End';
        jumpBtn.style.marginTop = '10px';
        jumpBtn.style.padding = '5px 10px';
        jumpBtn.style.cursor = 'pointer';
        jumpBtn.style.width = '100%';
        jumpBtn.style.border = 'none';
        jumpBtn.style.background = '#f0f0f0';
        jumpBtn.style.fontWeight = 'bold';

        jumpBtn.addEventListener('click', () => {
            const endIndex = quill.getLength() - 1;
            quill.setSelection(endIndex, 0, 'silent');
            const [blot] = quill.getLine(endIndex);
            if (blot && blot.domNode?.scrollIntoView) {
                blot.domNode.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        });

        sceneList.appendChild(jumpBtn);
    }
}




let listVisible = true;

document.getElementById('listBtn').addEventListener('click', toggleSceneList);

function toggleSceneList() {
    const sceneList = document.getElementById('sceneList');
    const listBtn = document.getElementById('listBtn');

    if (listVisible) {
        sceneList.style.display = "none";
        listBtn.innerHTML = '&#9776;'; // Menu icon
    } else {
        sceneList.style.display = "block";
        listBtn.innerHTML = '&#10005;'; // Close (×) icon
    }

    listVisible = !listVisible;
}

let draggingItem = null;
const placeholder = document.createElement('li');
placeholder.className = 'placeholder';

// Store the offset of cursor inside the dragged element
let dragOffsetX = 0;
let dragOffsetY = 0;

// Custom drag image element
let customDragImage = null;

sceneList.addEventListener('dragstart', (e) => {
    draggingItem = e.target;

    const rect = draggingItem.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    // Hide native drag image
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8z8BQDwAE/wH+gKIdGwAAAABJRU5ErkJggg==';
    e.dataTransfer.setDragImage(img, 0, 0);

    // Just hide the original item visually but keep its space
    setTimeout(() => {
        draggingItem.style.display = 'none';
    }, 0);

    // Create the custom drag image (clone)
    customDragImage = draggingItem.cloneNode(true);
    customDragImage.style.position = 'fixed';
    customDragImage.style.pointerEvents = 'none';
    customDragImage.style.height = '40px'
    customDragImage.style.top = `${e.clientY - dragOffsetY}px`;
    customDragImage.style.left = `${e.clientX - dragOffsetX}px`;
    customDragImage.style.width = `${rect.width}px`;
    customDragImage.style.opacity = '1';
    customDragImage.style.zIndex = '1000';
    customDragImage.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    customDragImage.style.backgroundColor = 'white';
    document.body.appendChild(customDragImage);

    // Insert placeholder immediately after dragging item
    sceneList.insertBefore(placeholder, draggingItem.nextSibling);
});


sceneList.addEventListener('dragend', () => {
    if (!draggingItem) return;

    // Show original item again (reset visibility, not display)
    draggingItem.style.display = '';

    // Reset all the inline styles you set during dragstart
    draggingItem.style.height = '';
    draggingItem.style.margin = '';
    draggingItem.style.padding = '';
    draggingItem.style.border = '';
    draggingItem.style.backgroundColor = '';
    draggingItem.style.cursor = '';
    draggingItem.style.transition = '';

    draggingItem.classList.remove('dragging');

    // Remove custom drag image from DOM
    if (customDragImage) {
        document.body.removeChild(customDragImage);
        customDragImage = null;
    }

    // Remove placeholder
    placeholder.remove();

    // Reset variables
    draggingItem = null;
    dragOffsetX = 0;
    dragOffsetY = 0;
});


sceneList.addEventListener('dragover', (e) => {
    e.preventDefault();

    // Update custom drag image position to follow cursor
    if (customDragImage) {
        customDragImage.style.top = `${e.clientY - dragOffsetY}px`;
        customDragImage.style.left = `${e.clientX - dragOffsetX}px`;
    }

    // Calculate where to insert placeholder based on cursor Y
    const afterElement = getDragAfterElement(sceneList, e.clientY);

    if (!afterElement) {
        sceneList.appendChild(placeholder);
    } else {
        sceneList.insertBefore(placeholder, afterElement);
    }
});

sceneList.addEventListener('drop', (e) => {
    e.preventDefault();

    if (draggingItem && placeholder.parentNode) {
        sceneList.insertBefore(draggingItem, placeholder);
        placeholder.remove();
    }

    changeSceneOrder();
});

function getDragAfterElement(container, y) {
    // Get all draggable list items except placeholder and hidden ones
    const draggableElements = [...container.querySelectorAll('li:not(.placeholder):not([style*="display: none"])')];

    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

    for (const child of draggableElements) {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);

        // If cursor is above midpoint and closer than previous closest
        if (offset < 0 && offset > closest.offset) {
            closest = { offset, element: child };
        }
    }

    return closest.element;
}

function changeSceneOrder() {
    quill.setContents([]); // Clear editor

    // Insert metadata if present
    if (script.metadata) {
        quill.insertText(0, script.metadata + '\n\n', 'silent');
    }

    // Insert scenes in sidebar order and bold the headings
    sceneList.querySelectorAll('li').forEach(li => {
        const index = li.dataset.index;
        const scene = script[index];
        if (!scene || !scene.content) return;

        const insertAt = quill.getLength();
        const fullText = scene.content.join('\n') + '\n\n';
        quill.insertText(insertAt, fullText, 'silent');

        // Bold heading
        quill.formatText(insertAt, scene.heading.length, { bold: true }, 'silent');
    });
}

