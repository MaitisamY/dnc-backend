const calculateCost = (uploadedNumbers) => {
    // Cost calculation logic here
    const coins = 270000;
    return coins - uploadedNumbers;
}

const cleanPhoneNumber = (phoneNumber) => {
    // Check if phoneNumber is defined
    if (phoneNumber === undefined || phoneNumber === null) {
        return null;
    }
    // Remove all non-numeric characters from the phone number
    return phoneNumber.toString().replace(/\D/g, '');
}

const formatDateTime = () => {
    const date = new Date();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const time = `${hours}:${minutes} - ${ampm}`;

    return `${dayName} ${monthName} ${day} ${year} (${time})`;
}

export { calculateCost, cleanPhoneNumber, formatDateTime }