/**
 * 翻译页面上的文本内容。
 * @param {Object} translations - 包含原始文本和目标语言翻译文本的JSON对象。
 * @param {string} selector - 用于选择需要翻译元素的选择器字符串。
 */
function translatePage(translations, selector = '*') {
    // 翻译单个节点的内容
    function translateElement(element) {
        let text = element.nodeValue || element.value || element.innerHTML;
        text = text.trim();
        if (translations.hasOwnProperty(text)) {
            if (element.nodeValue !== undefined) {
                element.nodeValue = translations[text];
            } else if (element.value !== undefined) {
                element.value = translations[text];
            } else {
                element.innerHTML = translations[text];
            }
        }

        // 处理 placeholder 属性
        if (element.nodeType === Node.ELEMENT_NODE && element.hasAttribute('placeholder')) {
            const placeholderText = element.getAttribute('placeholder').trim();
            if (translations.hasOwnProperty(placeholderText)) {
                element.setAttribute('placeholder', translations[placeholderText]);
            }
        }
    }

    document.querySelectorAll(selector).forEach(function (node) {
        node.childNodes.forEach(function (childNode) {
            // 处理文本节点
            if (childNode.nodeType === Node.TEXT_NODE && childNode.nodeValue.trim()) {
                translateElement(childNode);
            }
            // 处理输入框或文本区域等表单元素
            else if (childNode.nodeType === Node.ELEMENT_NODE && ['INPUT', 'TEXTAREA'].includes(childNode.tagName)) {
                translateElement(childNode);
            }
        });
    });
}

// export default translatePage;


