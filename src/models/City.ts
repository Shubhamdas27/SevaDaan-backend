import mongoose, { Schema, Document } from 'mongoose';

export interface ICity extends Document {
  name: string;
  state: string;
  country: string;
  pincode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

const CitySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  state: {
    type: String,
    required: true,
    index: true
  },
  country: {
    type: String,
    required: true,
    default: 'India'
  },
  pincode: {
    type: String
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}, { timestamps: true });

// Create text index for faster searching
CitySchema.index({ name: 'text', state: 'text' });

export default mongoose.model<ICity>('City', CitySchema);
