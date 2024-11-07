module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require empty lines between multiline sibling elements',
      category: 'Stylistic Issues',
    },
    fixable: 'whitespace',
    schema: []
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    
    function isMultiline(node) {
      if (!node.loc) return false;
      return node.loc.start.line !== node.loc.end.line;
    }

    return {
      // Target HTML elements directly
      'Tag'(node) {
        if (!node.parent || !node.parent.children) return;
        
        const siblings = node.parent.children;
        const currentIndex = siblings.indexOf(node);
        
        // Skip if this is the last child
        if (currentIndex === siblings.length - 1) return;
        
        const nextSibling = siblings[currentIndex + 1];
        
        // Check if either current node or next sibling is multiline
        if (isMultiline(node) || isMultiline(nextSibling)) {
          const linesBetween = nextSibling.loc.start.line - node.loc.end.line;
          
          if (linesBetween !== 2) {
            context.report({
              node: nextSibling,
              message: 'Multiline sibling elements should have an empty line between them',
              fix(fixer) {
                const lineBreaks = '\n'.repeat(2 - linesBetween);
                return fixer.insertTextBefore(nextSibling, lineBreaks);
              }
            });
          }
        }
      }
    };
  }
};