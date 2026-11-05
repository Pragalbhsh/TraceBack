// Item categories. Keep this list in sync with traceback-client/src/lib/constants.js
const CATEGORIES = [
    { value: 'phone', label: 'Phone' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'wallet', label: 'Wallet / purse' },
    { value: 'keys', label: 'Keys' },
    { value: 'bag', label: 'Bag / backpack' },
    { value: 'id-card', label: 'ID / cards' },
    { value: 'documents', label: 'Documents' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'jewellery', label: 'Jewellery / watch' },
    { value: 'accessories', label: 'Glasses / accessories' },
    { value: 'books', label: 'Books / stationery' },
    { value: 'pet', label: 'Pet' },
    { value: 'other', label: 'Other' },
];

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);
const categoryLabel = (value) => (CATEGORIES.find((c) => c.value === value) || {}).label || 'Other';

module.exports = { CATEGORIES, CATEGORY_VALUES, categoryLabel };
