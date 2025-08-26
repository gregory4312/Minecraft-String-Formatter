    let currentString = '';
    let clearedString = '';
    let bindings = [];
    let isSelecting = false;
    let selectionStart = -1;
    let selectionEnd = -1;
    let colors = [
        '#FF5722', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
        '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
        '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548'
    ];
    let knownProperties = {};

    function codePointLength(string) {
        let length = string.length;
        for (let i = 0; i < string.length; i++) {
            const codePoint = string.codePointAt(i);
            if (codePoint !== undefined) {
                if (codePoint > 0x007f) length++;
                if (codePoint > 0x07ff) length++;
                if (codePoint > 0xffff) length++;
            }
        }
        return length;
    }

    function analyzeString() {
        const flag = document.getElementById('flagInput').value;
        const input = document.getElementById('stringInput').value;

        if (!input.trim()) {
            alert('Please enter a string to analyze');
            return;
        }

        currentString = input;
        clearedString = input.startsWith(flag) ? input.substring(flag.length) : input;

        document.getElementById('originalLength').textContent = currentString.length;
        document.getElementById('clearedLength').textContent = clearedString.length;
        document.getElementById('codePointLength').textContent = codePointLength(clearedString);

        displayString();
        document.getElementById('displaySection').style.display = 'block';
    }

    function displayString() {
        const flag = document.getElementById('flagInput').value;
        const display = document.getElementById('stringDisplay');
        let html = '';

        // Display flag part
        if (currentString.startsWith(flag)) {
            html += `<span class="flag-part">${escapeHtml(flag)}</span>`;
        }

        // Display cleared string with binding segments
        let remainingString = clearedString;
        let processedLength = 0;

        // Calculate absolute positions for all bindings first
        const sortedBindings = [...bindings].sort((a, b) => a.startPos - b.startPos);

        for (let i = 0; i < sortedBindings.length; i++) {
            const binding = sortedBindings[i];
            const originalIndex = bindings.findIndex(b => b === binding);

            // Add non-binding text before this binding
            if (binding.startPos > processedLength) {
                const beforeText = remainingString.substring(processedLength, binding.startPos);
                for (let j = 0; j < beforeText.length; j++) {
                    html += `<span class="string-char" data-pos="${processedLength + j}">${escapeHtml(beforeText[j])}</span>`;
                }
            }

            // Add binding segment
            const bindingText = remainingString.substring(binding.startPos, binding.endPos);
            const colorIndex = originalIndex % colors.length;

            // Find overlapping bindings at this position
            const overlapping = bindings.filter(b =>
                b !== binding &&
                ((b.startPos >= binding.startPos && b.startPos < binding.endPos) ||
                 (b.endPos > binding.startPos && b.endPos <= binding.endPos) ||
                 (b.startPos <= binding.startPos && b.endPos >= binding.endPos))
            );

            const tooltipText = overlapping.length > 0
                ? `${binding.targetProperty} (overlaps: ${overlapping.map(b => b.targetProperty).join(', ')})`
                : binding.targetProperty;

            html += `<span class="binding-segment" style="background-color: ${colors[colorIndex]}40; border: 1px solid ${colors[colorIndex]};" data-binding-index="${originalIndex}">`;
            for (let j = 0; j < bindingText.length; j++) {
                html += `<span class="string-char binding-char" data-pos="${binding.startPos + j}">${escapeHtml(bindingText[j])}</span>`;
            }
            html += `<div class="tooltip">${tooltipText}</div></span>`;

            processedLength = binding.endPos;
        }

        // Add remaining text
        if (processedLength < remainingString.length) {
            const remainingText = remainingString.substring(processedLength);
            for (let j = 0; j < remainingText.length; j++) {
                html += `<span class="string-char" data-pos="${processedLength + j}">${escapeHtml(remainingText[j])}</span>`;
            }
        }

        display.innerHTML = html;

        // Add click handlers for selection (only for non-binding chars)
        const chars = display.querySelectorAll('.string-char:not(.binding-char)');
        chars.forEach(char => {
            char.addEventListener('click', handleCharClick);
            char.addEventListener('mouseenter', handleCharHover);
        });

        // Add click handlers for binding segments
        const bindingSegments = display.querySelectorAll('.binding-segment');
        bindingSegments.forEach(segment => {
            segment.addEventListener('click', handleBindingSegmentClick);
        });

        updateColorLegend();
    }

    function updateColorLegend() {
        const legend = document.getElementById('colorLegend');
        if (bindings.length === 0) {
            legend.style.display = 'none';
            return;
        }

        legend.style.display = 'flex';
        let html = '<div class="color-item"><div class="color-box" style="background-color: #FF9800;"></div><span>Flag</span></div>';

        bindings.forEach((binding, index) => {
            const color = colors[index % colors.length];
            html += `<div class="color-item">
                <div class="color-box" style="background-color: ${color};"></div>
                <span>${binding.targetProperty}</span>
            </div>`;
        });

        legend.innerHTML = html;
    }

    function handleCharClick(event) {
        if (!isSelecting) return;

        const pos = parseInt(event.target.dataset.pos);

        if (selectionStart === -1) {
            selectionStart = pos;
            updateSelection();
        } else {
            selectionEnd = pos;
            if (selectionEnd < selectionStart) {
                [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
            }
            selectionEnd++; // Make it inclusive
            updateSelection();
            isSelecting = false;
        }
    }

    function handleCharHover(event) {
        if (!isSelecting || selectionStart === -1) return;

        const pos = parseInt(event.target.dataset.pos);
        let tempEnd = pos + 1;
        let tempStart = selectionStart;

        if (tempEnd < tempStart) {
            [tempStart, tempEnd] = [tempEnd - 1, tempStart + 1];
        }

        updateSelectionPreview(tempStart, tempEnd);
    }

    function handleBindingSegmentClick(event) {
        event.stopPropagation(); // Prevent char click from firing
        const bindingIndex = parseInt(event.currentTarget.dataset.bindingIndex);
        scrollToBinding(bindingIndex);
    }

    function scrollToBinding(bindingIndex) {
        // Scroll to the binding in the list
        const bindingItems = document.querySelectorAll('.binding-item');
        if (bindingItems[bindingIndex]) {
            bindingItems[bindingIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Highlight the binding temporarily
            bindingItems[bindingIndex].style.border = '2px solid #4CAF50';
            bindingItems[bindingIndex].style.backgroundColor = 'rgba(76, 175, 80, 0.1)';

            setTimeout(() => {
                bindingItems[bindingIndex].style.border = '1px solid #555';
                bindingItems[bindingIndex].style.backgroundColor = '#1a1a1a';
            }, 2000);
        }
    }

    function updateSelection() {
        clearSelectionHighlight();

        if (selectionStart !== -1) {
            const end = selectionEnd !== -1 ? selectionEnd : selectionStart + 1;
            highlightRange(selectionStart, end);
            updateSelectionInfo(selectionStart, end);
        }
    }

    function updateSelectionPreview(start, end) {
        clearSelectionHighlight();
        highlightRange(start, end);
        updateSelectionInfo(start, end);
    }

    function highlightRange(start, end) {
        const chars = document.querySelectorAll('.string-char');
        for (let i = start; i < end && i < chars.length; i++) {
            const char = document.querySelector(`[data-pos="${i}"]`);
            if (char) char.classList.add('selected');
        }
    }

    function clearSelectionHighlight() {
        const selected = document.querySelectorAll('.string-char.selected');
        selected.forEach(char => char.classList.remove('selected'));
    }

    function updateSelectionInfo(start, end) {
        const length = end - start;
        const selectedText = clearedString.substring(start, end);
        const info = document.getElementById('selectionInfo');
        const details = document.getElementById('selectionDetails');

        details.textContent = `Position ${start}-${end-1} (Length: ${length}) - "${selectedText}"`;
        info.style.display = 'block';
    }

    function startSelection() {
        isSelecting = true;
        selectionStart = -1;
        selectionEnd = -1;
        clearSelectionHighlight();
        document.getElementById('selectionInfo').style.display = 'none';
        alert('Click on characters to select a range. Click start position, then end position.');
    }

    function clearSelection() {
        isSelecting = false;
        selectionStart = -1;
        selectionEnd = -1;
        clearSelectionHighlight();
        document.getElementById('selectionInfo').style.display = 'none';
    }

    function createBinding() {
        if (selectionStart === -1 || selectionEnd === -1) {
            alert('Please select a range first');
            return;
        }

        const targetProperty = document.getElementById('targetProperty').value.trim();
        if (!targetProperty) {
            alert('Please enter a target property name');
            return;
        }

        const length = selectionEnd - selectionStart;
        const skipLength = selectionStart;

        let sourceProperty;
        if (skipLength === 0) {
            sourceProperty = `('%.${length}s' * #cleared_flag_text)`;
        } else {
            sourceProperty = `('%.${length}s' * (#cleared_flag_text - ('%.${skipLength}s' * #cleared_flag_text)))`;
        }

        const binding = {
            startPos: selectionStart,
            endPos: selectionEnd,
            length: length,
            skipLength: skipLength,
            targetProperty: targetProperty,
            sourceProperty: sourceProperty,
            json: {
                binding_type: "view",
                source_property_name: sourceProperty,
                target_property_name: targetProperty
            }
        };

        bindings.push(binding);
        knownProperties[binding.targetProperty] = binding;
        displayString();
        displayBindings();
        clearSelection();
        document.getElementById('targetProperty').value = '';
    }

    function importBinding() {
        const input = document.getElementById('importBinding').value.trim();
        if (!input) {
            alert('Please paste binding JSON(s)');
            return;
        }

        try {
            let cleanInput = cleanJsonInput(input);
            let bindingArray = [];

            try {
                bindingArray = JSON.parse('[' + cleanInput + ']');
            } catch {
                try {
                    const singleBinding = JSON.parse(cleanInput);
                    bindingArray = [singleBinding];
                } catch {
                    alert('Invalid JSON format. Please check your input.');
                    return;
                }
            }

            let importedCount = 0;
            let failedCount = 0;

            for (const bindingJson of bindingArray) {
                if (!bindingJson.source_property_name || !bindingJson.target_property_name) {
                    failedCount++;
                    continue;
                }

                const sourceProperty = bindingJson.source_property_name;
                const targetProperty = bindingJson.target_property_name;

                const parsed = parseSourceProperty(sourceProperty);
                if (!parsed) {
                    console.warn(`Could not parse source property: ${sourceProperty}`);
                    failedCount++;
                    continue;
                }

                const baseSource = parsed.baseSource;
                let baseLength = 0;
                let baseSkip = 0;

                if (baseSource !== '#cleared_flag_text' && knownProperties[baseSource]) {
                    const baseBinding = knownProperties[baseSource];
                    baseLength = baseBinding.endPos - baseBinding.startPos;
                    baseSkip = baseBinding.skipLength;
                }

                const calculatedSkip = baseSkip + parsed.skipLength;
                const calculatedLength = (parsed.length === -1) ? (clearedString.length - calculatedSkip) : parsed.length;

                const binding = {
                    startPos: calculatedSkip,
                    endPos: calculatedSkip + calculatedLength,
                    length: calculatedLength,
                    skipLength: parsed.skipLength,
                    targetProperty: targetProperty,
                    sourceProperty: sourceProperty,
                    json: bindingJson
                };

                bindings.push(binding);
                knownProperties[binding.targetProperty] = binding;
                importedCount++;
            }

            // Re-sort bindings based on their absolute start positions
            bindings.sort((a, b) => a.startPos - b.startPos);

            // Re-run the analysis to get the correct positions for all bindings
            calculateAllBindingPositions();
            displayString();
            displayBindings();
            document.getElementById('importBinding').value = '';

            let message = `Successfully imported ${importedCount} binding(s)`;
            if (failedCount > 0) {
                message += `\n${failedCount} binding(s) failed to import (check console for details)`;
            }
            alert(message);

        } catch (error) {
            console.error('Import error:', error);
            alert('Error processing input. Please check the format and try again.');
        }
    }

    function importJsonFile() {
        const input = document.getElementById('importBinding').value.trim();
        if (!input) {
            alert('Please paste a JSON file to analyze');
            return;
        }

        try {
            const cleanedInput = cleanJsonForFile(input);
            const jsonData = JSON.parse(cleanedInput);
            const extractedBindings = extractStringFormattingBindings(jsonData);

            if (extractedBindings.length === 0) {
                alert('No string formatting bindings found in the JSON file');
                return;
            }

            // Clear existing bindings for a fresh import
            clearAll(true);

            let importedCount = 0;
            let failedCount = 0;
            let skippedCount = 0;

            for (const bindingJson of extractedBindings) {
                const sourceProperty = bindingJson.source_property_name;
                const targetProperty = bindingJson.target_property_name;

                const parsed = parseSourceProperty(sourceProperty);
                if (!parsed) {
                    console.warn(`Could not parse source property: ${sourceProperty}`);
                    failedCount++;
                    continue;
                }

                const exists = bindings.some(b =>
                    b.targetProperty === targetProperty &&
                    b.sourceProperty === sourceProperty
                );

                if (exists) {
                    skippedCount++;
                    continue;
                }

                // Temporary binding object, positions will be calculated later
                const tempBinding = {
                    targetProperty: targetProperty,
                    sourceProperty: sourceProperty,
                    json: bindingJson,
                    parsed: parsed
                };

                bindings.push(tempBinding);
                knownProperties[targetProperty] = tempBinding;
            }

            // Calculate all positions based on the full set of bindings
            calculateAllBindingPositions();

            // Filter out bindings that couldn't have their positions resolved
            const oldBindingsLength = bindings.length;
            bindings = bindings.filter(b => b.startPos !== undefined);
            const successfulImports = bindings.length;
            failedCount += oldBindingsLength - successfulImports;
            importedCount = successfulImports - skippedCount;

            // Re-run the analysis to display the new bindings
            displayString();
            displayBindings();
            document.getElementById('importBinding').value = '';

            let message = `Auto-extracted ${extractedBindings.length} string formatting bindings from JSON file:\n`;
            message += `✓ Successfully imported: ${successfulImports}\n`;
            if (skippedCount > 0) message += `↷ Skipped duplicates: ${skippedCount}\n`;
            if (failedCount > 0) message += `✗ Failed to parse or resolve: ${failedCount}`;

            alert(message);
        } catch (error) {
            console.error('JSON parsing error:', error);
            alert('Error parsing JSON file. Please check the format and try again.');
        }
    }

    function calculateAllBindingPositions() {
        let iterations = 0;
        const maxIterations = 100; // Safety break for circular dependencies

        while (true && iterations < maxIterations) {
            let changesMade = false;
            iterations++;
            // Sort bindings based on their source_property_name dependency
            bindings.sort((a, b) => {
                const aDependsOnB = a.parsed && a.parsed.baseSource === b.targetProperty;
                const bDependsOnA = b.parsed && b.parsed.baseSource === a.targetProperty;
                if (aDependsOnB) return 1;
                if (bDependsOnA) return -1;
                return 0;
            });

            for (const binding of bindings) {
                if (binding.startPos !== undefined) {
                    continue; // Already processed
                }

                const parsed = binding.parsed;
                const baseSource = parsed.baseSource;
                let baseSkip = 0;

                if (baseSource !== '#cleared_flag_text') {
                    const baseBinding = knownProperties[baseSource];
                    if (!baseBinding || baseBinding.startPos === undefined) {
                        continue; // Base binding not yet resolved
                    }
                    baseSkip = baseBinding.startPos;
                }

                const calculatedSkip = baseSkip + parsed.skipLength;
                const calculatedLength = (parsed.length === -1) ? (clearedString.length - calculatedSkip) : parsed.length;

                // Update the binding with its calculated positions
                binding.startPos = calculatedSkip;
                binding.endPos = calculatedSkip + calculatedLength;
                binding.length = calculatedLength;
                changesMade = true;
            }

            if (!changesMade) {
                break; // No more bindings could be resolved
            }
        }
    }

    function extractStringFormattingBindings(obj, path = '') {
        let bindings = [];

        if (typeof obj !== 'object' || obj === null) {
            return bindings;
        }

        // Check if this is a binding object
        if (obj.binding_type === 'view' && obj.source_property_name && obj.target_property_name) {
            const sourceProperty = obj.source_property_name;
            const targetProperty = obj.target_property_name;

            // Skip #visible bindings
            if (targetProperty === '#visible') {
                return bindings;
            }

            // Check if it's a string formatting binding
            if (isStringFormattingBinding(sourceProperty)) {
                bindings.push({
                    binding_type: obj.binding_type,
                    source_property_name: sourceProperty,
                    target_property_name: targetProperty
                });
            }
        }

        // Recursively search through all properties
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                bindings.push(...extractStringFormattingBindings(item));
            });
        } else {
            for (const key in obj) {
                bindings.push(...extractStringFormattingBindings(obj[key]));
            }
        }

        return bindings;
    }

    function isStringFormattingBinding(sourceProperty) {
        if (typeof sourceProperty !== 'string') return false;

        // Look for the core patterns anywhere in the expression
        const patterns = [
            /\('%.(\d+)s'\s*\*\s*#([\w_]+)\)/, // `('%.Xs' * #property)`
            /\(#([\w_]+)\s*-\s*\('%.(\d+)s'\s*\*\s*#([\w_]+)\)\)/, // `(#property - ('%.Ys' * #property))`
            /\('%.(\d+)s'\s*\*\s*\(\s*#([\w_]+)\s*-\s*\('%.(\d+)s'\s*\*\s*#([\w_]+)\)\s*\)\)/ // `('%.Xs' * (#property - ('%.Ys' * #property)))`
        ];

        return patterns.some(pattern => pattern.test(sourceProperty));
    }

    function parseSourceProperty(sourceProperty) {
        // Pattern: `('%.Xs' * (#property - ('%.Ys' * #property)))`
        let match = sourceProperty.match(/\('%.(\d+)s'\s*\*\s*\(\s*#([\w_]+)\s*-\s*\('%.(\d+)s'\s*\*\s*#([\w_]+)\)\s*\)\)/);
        if (match) {
            const takeLength = parseInt(match[1]);
            const baseSource = match[2];
            const skipLength = parseInt(match[3]);
            return { length: takeLength, skipLength: skipLength, baseSource: baseSource };
        }

        // Pattern: `(#property - ('%.Xs' * #property))`
        match = sourceProperty.match(/\(#([\w_]+)\s*-\s*\('%.(\d+)s'\s*\*\s*#([\w_]+)\)\)/);
        if (match) {
            const baseSource = match[1];
            const skipLength = parseInt(match[2]);
            return { length: -1, skipLength: skipLength, baseSource: baseSource };
        }

        // Pattern: `('%.Xs' * #property)`
        match = sourceProperty.match(/\('%.(\d+)s'\s*\*\s*#([\w_]+)\)/);
        if (match) {
            const length = parseInt(match[1]);
            const baseSource = match[2];
            return { length: length, skipLength: 0, baseSource: baseSource };
        }

        console.log('No pattern matched for source property:', sourceProperty);
        return null;
    }

    function cleanJsonForFile(input) {
        let cleaned = input;
        cleaned = cleaned.replace(/\/\/[^\r\n]*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        return cleaned.trim();
    }

    function cleanJsonInput(input) {
        let cleaned = input.replace(/\/\/.*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        cleaned = cleaned.trim();
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            cleaned = cleaned.slice(1, -1);
        }
        cleaned = cleaned.replace(/,\s*$/, '');
        return cleaned;
    }

    function displayBindings() {
        const list = document.getElementById('bindingList');
        list.innerHTML = '';

        bindings.forEach((binding, index) => {
            const startPos = binding.startPos !== undefined ? binding.startPos : 'N/A';
            const endPos = binding.endPos !== undefined ? binding.endPos - 1 : 'N/A';
            const length = binding.length !== undefined ? binding.length : 'N/A';
            const selectedText = (binding.startPos !== undefined && binding.endPos !== undefined) ?
                clearedString.substring(binding.startPos, binding.endPos) :
                'Could not resolve text';

            const item = document.createElement('div');
            item.className = 'binding-item';

            item.innerHTML = `
                <button class="remove-btn" onclick="removeBinding(${index})">×</button>
                <div><strong>Target:</strong> ${binding.targetProperty}</div>
                <div><strong>Position:</strong> ${startPos}-${endPos} (Length: ${length})</div>
                <div><strong>Selected Text:</strong> "${selectedText}"</div>
                <div><strong>Source Property:</strong></div>
                <pre style="background: #1a1a1a; padding: 8px; border-radius: 4px; margin-top: 5px; white-space: pre-wrap;">${JSON.stringify(binding.json, null, 2)}</pre>
            `;
            list.appendChild(item);
        });
    }

    function removeBinding(index) {
        const removedBinding = bindings.splice(index, 1)[0];
        delete knownProperties[removedBinding.targetProperty];
        calculateAllBindingPositions();
        displayString();
        displayBindings();
    }

    function exportAllBindings() {
        if (bindings.length === 0) {
            alert('No bindings to export');
            return;
        }

        const exported = bindings.map(b => b.json);
        const jsonStr = JSON.stringify(exported, null, 2);

        navigator.clipboard.writeText(jsonStr).then(() => {
            alert('Bindings copied to clipboard!');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = jsonStr;
            textarea.style.width = '100%';
            textarea.style.height = '300px';

            const popup = window.open('', '_blank', 'width=600,height=400');
            popup.document.body.appendChild(textarea);
            textarea.select();
            alert('Please copy the JSON from the new window');
        });
    }

    function clearAll(keepFlag = false) {
        currentString = '';
        clearedString = '';
        bindings = [];
        knownProperties = {};
        selectionStart = -1;
        selectionEnd = -1;
        isSelecting = false;

        document.getElementById('stringInput').value = '';
        document.getElementById('displaySection').style.display = 'none';
        document.getElementById('bindingList').innerHTML = '';
        document.getElementById('importBinding').value = '';
        document.getElementById('targetProperty').value = '';

        if (!keepFlag) {
            document.getElementById('flagInput').value = '';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.onload = function() {
        analyzeString();
    };