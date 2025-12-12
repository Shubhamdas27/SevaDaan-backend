import City from '../../models/City';
import mongoose from 'mongoose';

// Top Indian cities seed data
const cities = [
  { name: 'Mumbai', state: 'Maharashtra', country: 'India' },
  { name: 'Delhi', state: 'Delhi', country: 'India' },
  { name: 'Bangalore', state: 'Karnataka', country: 'India' },
  { name: 'Hyderabad', state: 'Telangana', country: 'India' },
  { name: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  { name: 'Kolkata', state: 'West Bengal', country: 'India' },
  { name: 'Ahmedabad', state: 'Gujarat', country: 'India' },
  { name: 'Pune', state: 'Maharashtra', country: 'India' },
  { name: 'Surat', state: 'Gujarat', country: 'India' },
  { name: 'Jaipur', state: 'Rajasthan', country: 'India' },
  { name: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Kanpur', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Nagpur', state: 'Maharashtra', country: 'India' },
  { name: 'Indore', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Thane', state: 'Maharashtra', country: 'India' },
  { name: 'Bhopal', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India' },
  { name: 'Patna', state: 'Bihar', country: 'India' },
  { name: 'Vadodara', state: 'Gujarat', country: 'India' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Ludhiana', state: 'Punjab', country: 'India' },
  { name: 'Agra', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Nashik', state: 'Maharashtra', country: 'India' },
  { name: 'Faridabad', state: 'Haryana', country: 'India' },
  { name: 'Meerut', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Rajkot', state: 'Gujarat', country: 'India' },
  { name: 'Kalyan-Dombivli', state: 'Maharashtra', country: 'India' },
  { name: 'Vasai-Virar', state: 'Maharashtra', country: 'India' },
  { name: 'Varanasi', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Srinagar', state: 'Jammu and Kashmir', country: 'India' },
  { name: 'Aurangabad', state: 'Maharashtra', country: 'India' },
  { name: 'Dhanbad', state: 'Jharkhand', country: 'India' },
  { name: 'Amritsar', state: 'Punjab', country: 'India' },
  { name: 'Allahabad', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Ranchi', state: 'Jharkhand', country: 'India' },
  { name: 'Howrah', state: 'West Bengal', country: 'India' },
  { name: 'Coimbatore', state: 'Tamil Nadu', country: 'India' },
  { name: 'Jabalpur', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Gwalior', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', country: 'India' },
  { name: 'Jodhpur', state: 'Rajasthan', country: 'India' },
  { name: 'Madurai', state: 'Tamil Nadu', country: 'India' },
  { name: 'Raipur', state: 'Chhattisgarh', country: 'India' },
  { name: 'Kota', state: 'Rajasthan', country: 'India' },
  { name: 'Chandigarh', state: 'Chandigarh', country: 'India' },
  { name: 'Guwahati', state: 'Assam', country: 'India' },
  { name: 'Solapur', state: 'Maharashtra', country: 'India' },
  { name: 'Hubli-Dharwad', state: 'Karnataka', country: 'India' },
  { name: 'Mysore', state: 'Karnataka', country: 'India' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India' }
];

// Add more variants for cities like "Gwalior" for better search results
const extendedCities = [
  ...cities,
  { name: 'Gwalior Fort Area', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Gwalior Cantt', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Gwalior City', state: 'Madhya Pradesh', country: 'India' },
  { name: 'New Delhi', state: 'Delhi', country: 'India' },
  { name: 'Delhi NCR', state: 'Delhi', country: 'India' },
  { name: 'Mumbai Suburbs', state: 'Maharashtra', country: 'India' },
  { name: 'South Mumbai', state: 'Maharashtra', country: 'India' },
  { name: 'Electronic City, Bangalore', state: 'Karnataka', country: 'India' },
  { name: 'Whitefield, Bangalore', state: 'Karnataka', country: 'India' },
  { name: 'Salt Lake City, Kolkata', state: 'West Bengal', country: 'India' }
];

/**
 * Seed the cities collection
 */
const seedCities = async () => {
  try {
    // Count existing cities
    const count = await City.countDocuments();
    
    if (count === 0) {      console.info('Seeding cities collection...');
      await City.insertMany(extendedCities);
      console.info(`Successfully seeded ${extendedCities.length} cities`);    } else {
      console.info(`Cities collection already has ${count} documents, skipping seeding`);
    }
    
    return true;
  } catch (error) {
    console.error('Error seeding cities collection:', error);
    throw error;
  }
};

export default seedCities;
