// Keep in sync with lib/categories.js in the backend.
export const CATEGORIES = [
    { value: 'phone', label: 'Phone', icon: '📱' },
    { value: 'electronics', label: 'Electronics', icon: '💻' },
    { value: 'wallet', label: 'Wallet / purse', icon: '👛' },
    { value: 'keys', label: 'Keys', icon: '🔑' },
    { value: 'bag', label: 'Bag / backpack', icon: '🎒' },
    { value: 'id-card', label: 'ID / cards', icon: '🪪' },
    { value: 'documents', label: 'Documents', icon: '📄' },
    { value: 'clothing', label: 'Clothing', icon: '🧥' },
    { value: 'jewellery', label: 'Jewellery / watch', icon: '⌚' },
    { value: 'accessories', label: 'Glasses / accessories', icon: '👓' },
    { value: 'books', label: 'Books / stationery', icon: '📚' },
    { value: 'pet', label: 'Pet', icon: '🐾' },
    { value: 'other', label: 'Other', icon: '📦' },
];

export const categoryInfo = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

export const STRENGTH_LABEL = {
    strong: 'Strong match',
    good: 'Good match',
    weak: 'Possible match',
};
