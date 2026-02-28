// CRAVE v2 — Mock Data & API Layer (prices in ₹)

export const restaurants = [
    { id: 1, name: "upes ka food (Swadu).", cuisine: "Italian • Artisan", description: "Wood-fired artisan pizzas with locally sourced ingredients and a crispy, smoky finish.", rating: 4.8, time: "25–35 min", priceRange: "₹₹", emoji: "🍕", color: "#2a1010" },
    { id: 2, name: "Noodle Nirvana (konoha)", cuisine: "Pan-Asian • Ramen", description: "Handmade noodles and rich broths from across Asia — ramen, pho, and beyond.", rating: 4.6, time: "20–30 min", priceRange: "₹₹", emoji: "🍜", color: "#0d1a2a" },
    { id: 3, name: "El Fuego Tacos (dominos)", cuisine: "Mexican • Street Food", description: "Authentic Mexican street tacos, burritos, and quesadillas with house-made salsas.", rating: 4.7, time: "15–25 min", priceRange: "₹₹", emoji: "🌮", color: "#1a1200" },
    { id: 4, name: "Zen Sushi Bar (bunk)", cuisine: "Japanese • Premium", description: "Premium sushi and sashimi crafted by master chefs using the freshest fish daily.", rating: 4.9, time: "30–45 min", priceRange: "₹₹₹", emoji: "🍣", color: "#001a15" },
    { id: 5, name: "The Burger Vault (burger belly)", cuisine: "American • Gourmet", description: "Double-smashed patties, aged cheddar, and sauces made from scratch every morning.", rating: 4.5, time: "20–30 min", priceRange: "₹₹", emoji: "🍔", color: "#1a0d00" },
    { id: 6, name: "Spice Route (spicy bowl)", cuisine: "Indian • Contemporary", description: "Modern takes on Indian classics — biryanis, curries, and tandoor-grilled mains.", rating: 4.7, time: "25–40 min", priceRange: "₹₹", emoji: "🥘", color: "#1a0a00" },
];

export const allMenus: Record<number, Record<string, { id: number; name: string; desc: string; price: number; emoji: string }[]>> = {
    1: {
        starters: [
            { id: 101, name: "Garlic Bread Knots", desc: "Twisted dough, roasted garlic butter, fresh herbs", price: 349, emoji: "🧄" },
            { id: 102, name: "Burrata Bruschetta", desc: "Heirloom tomato, basil oil, aged balsamic", price: 599, emoji: "🫙" },
        ],
        mains: [
            { id: 201, name: "Margherita Inferno", desc: "San Marzano tomato, fior di latte, fresh basil, EVOO", price: 100, emoji: "🍕" },
            { id: 202, name: "Truffle Funghi", desc: "Wild mushroom medley, black truffle, pecorino", price: 999, emoji: "🍄" },
            { id: 203, name: "Diavola", desc: "Spicy salami, chilli oil, smoked mozzarella", price: 949, emoji: "🌶️" },
        ],
        desserts: [
            { id: 301, name: "Tiramisu Classico", desc: "Mascarpone cream, espresso-soaked ladyfingers, cocoa", price: 449, emoji: "☕" },
            { id: 302, name: "Affogato", desc: "Vanilla gelato drowned in a shot of hot espresso", price: 349, emoji: "🍨" },
        ],
    },
    2: {
        starters: [
            { id: 110, name: "Gyoza (6pc)", desc: "Pan-fried pork dumplings with ponzu dip", price: 449, emoji: "🥟" },
            { id: 111, name: "Edamame", desc: "Steamed soybeans with sea salt & chili flakes", price: 299, emoji: "🫛" },
        ],
        mains: [
            { id: 210, name: "Tonkotsu Ramen", desc: "Rich pork bone broth, chashu, soft-boiled egg, nori", price: 849, emoji: "🍜" },
            { id: 211, name: "Spicy Miso Ramen", desc: "Fermented miso broth, chili oil, ground pork, corn", price: 899, emoji: "🌶️" },
            { id: 212, name: "Beef Pho", desc: "Slow-simmered beef broth, thin brisket, bean sprouts", price: 799, emoji: "🥩" },
        ],
        desserts: [
            { id: 310, name: "Matcha Mochi (3pc)", desc: "Green tea ice cream wrapped in soft rice dough", price: 399, emoji: "🍡" },
        ],
    },
    3: {
        starters: [
            { id: 120, name: "Chips & Guacamole", desc: "Fresh-made guac with house tortilla chips", price: 399, emoji: "🥑" },
            { id: 121, name: "Queso Fundido", desc: "Melted cheese, chorizo, roasted peppers", price: 499, emoji: "🧀" },
        ],
        mains: [
            { id: 220, name: "Carne Asada Tacos", desc: "Grilled steak, onion, cilantro, lime (3pc)", price: 649, emoji: "🥩" },
            { id: 221, name: "Al Pastor Tacos", desc: "Marinated pork, pineapple, onion, cilantro (3pc)", price: 599, emoji: "🍍" },
            { id: 222, name: "Chicken Burrito", desc: "Grilled chicken, rice, beans, cheese, sour cream", price: 699, emoji: "🌯" },
        ],
        desserts: [
            { id: 320, name: "Churros", desc: "Cinnamon sugar with chocolate dipping sauce", price: 349, emoji: "🍫" },
        ],
    },
    4: {
        starters: [
            { id: 130, name: "Miso Soup", desc: "Traditional dashi broth with tofu and wakame", price: 249, emoji: "🍲" },
        ],
        mains: [
            { id: 230, name: "Salmon Nigiri (4pc)", desc: "Premium Atlantic salmon over seasoned rice", price: 749, emoji: "🍣" },
            { id: 231, name: "Dragon Roll", desc: "Shrimp tempura, avocado, eel sauce, tobiko", price: 949, emoji: "🐉" },
            { id: 232, name: "Spicy Tuna Roll", desc: "Fresh tuna, spicy mayo, cucumber, sesame", price: 799, emoji: "🔥" },
        ],
        desserts: [
            { id: 330, name: "Mochi Ice Cream (3pc)", desc: "Green tea, mango, and strawberry", price: 399, emoji: "🍡" },
        ],
    },
    5: {
        starters: [
            { id: 140, name: "Truffle Fries", desc: "Hand-cut fries, truffle oil, parmesan", price: 449, emoji: "🍟" },
        ],
        mains: [
            { id: 240, name: "Classic Smash", desc: "Double patty, American cheese, pickles, secret sauce", price: 649, emoji: "🍔" },
            { id: 241, name: "Bacon BBQ Smash", desc: "Crispy bacon, BBQ sauce, onion rings, cheddar", price: 799, emoji: "🥓" },
            { id: 242, name: "Jalapeño Smash", desc: "Pepper jack, jalapeños, chipotle aioli", price: 749, emoji: "🌶️" },
        ],
        desserts: [
            { id: 340, name: "Milkshake", desc: "Thick vanilla bean shake with whipped cream", price: 399, emoji: "🥤" },
        ],
    },
    6: {
        starters: [
            { id: 150, name: "Samosa Chaat (4pc)", desc: "Crispy samosas, tamarind chutney, yogurt", price: 299, emoji: "🔺" },
            { id: 151, name: "Paneer Tikka", desc: "Tandoor-grilled cottage cheese, mint chutney", price: 449, emoji: "🧀" },
        ],
        mains: [
            { id: 250, name: "Butter Chicken", desc: "Creamy tomato curry, tender chicken, naan", price: 649, emoji: "🍗" },
            { id: 251, name: "Lamb Biryani", desc: "Fragrant basmati rice, slow-cooked lamb, saffron", price: 799, emoji: "🥘" },
            { id: 252, name: "Palak Paneer", desc: "Spinach curry with cottage cheese, cumin rice", price: 549, emoji: "🌿" },
        ],
        desserts: [
            { id: 350, name: "Gulab Jamun (3pc)", desc: "Warm milk dumplings in rose-cardamom syrup", price: 199, emoji: "🍯" },
        ],
    },
};

export const categories = [
    { label: "All", emoji: "🔥", value: "all" },
    { label: "Pizza", emoji: "🍕", value: "Italian" },
    { label: "Noodles", emoji: "🍜", value: "Pan-Asian" },
    { label: "Mexican", emoji: "🌮", value: "Mexican" },
    { label: "Sushi", emoji: "🍣", value: "Japanese" },
    { label: "Burgers", emoji: "🍔", value: "American" },
    { label: "Curry", emoji: "🥘", value: "Indian" },
];

// API layer — swap mocks for real fetch when backend is live
export const fetchRestaurants = async () => {
    await new Promise(r => setTimeout(r, 200));
    return restaurants;
};

export const fetchMenu = async (restaurantId: number) => {
    await new Promise(r => setTimeout(r, 200));
    return allMenus[restaurantId] || allMenus[1];
};

export const placeOrder = async () => {
    await new Promise(r => setTimeout(r, 2000));
    return { orderId: 'CR-' + Math.floor(Math.random() * 9999), status: 'confirmed' };
};
