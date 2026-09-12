const fs = require('fs');

let content = fs.readFileSync('src/components/SortableGrid.tsx', 'utf8');

// Insert the SmartPointerSensor implementation after the imports
const importsRegex = /import { motion, AnimatePresence } from 'motion\/react';/;
const smartSensorCode = `

function isInteractiveElement(element) {
  if (!element) return false;
  
  const interactiveElements = [
    'button',
    'input',
    'textarea',
    'select',
    'option',
    'a'
  ];

  if (element.tagName && interactiveElements.includes(element.tagName.toLowerCase())) {
    return true;
  }
  
  if (element.isContentEditable) return true;

  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 4) {
    if (parent.tagName && interactiveElements.includes(parent.tagName.toLowerCase())) {
      return true;
    }
    if (parent.isContentEditable) return true;
    if (parent.getAttribute('data-no-dnd') === 'true') return true;
    parent = parent.parentElement;
    depth++;
  }

  return element.getAttribute('data-no-dnd') === 'true';
}

class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: event }) => {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          isInteractiveElement(event.target)
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}
`;

content = content.replace(importsRegex, `import { motion, AnimatePresence } from 'motion/react';${smartSensorCode}`);

// Replace useSensor(PointerSensor, ...) with useSensor(SmartPointerSensor, ...)
content = content.replace('useSensor(PointerSensor, {', 'useSensor(SmartPointerSensor, {');

// We should also replace TouchSensor with a custom one or just rely on PointerSensor.
// Actually, dnd-kit's TouchSensor doesn't have an easy way to override activators like PointerSensor does if we want to ignore things, but we can just add an activationConstraint to PointerSensor and remove TouchSensor if it conflicts. 
// Or better, let's also create SmartTouchSensor!
// But wait, PointerSensor covers Touch in most modern browsers. 
// Let's create SmartTouchSensor just in case!

const smartTouchSensorCode = `
class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart',
      handler: ({ nativeEvent: event }) => {
        if (isInteractiveElement(event.target)) {
          return false;
        }
        return true;
      },
    },
  ];
}
`;

content = content.replace('class SmartPointerSensor', smartTouchSensorCode + '\nclass SmartPointerSensor');
content = content.replace('useSensor(TouchSensor, {', 'useSensor(SmartTouchSensor, {');

fs.writeFileSync('src/components/SortableGrid.tsx', content);
console.log("SortableGrid patched with Smart Sensors!");
