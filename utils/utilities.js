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

export { calculateCost, cleanPhoneNumber }