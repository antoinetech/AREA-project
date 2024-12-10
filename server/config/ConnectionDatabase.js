import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/my_database";


const connectToDatabase = async () => {
    try {
        await mongoose.connect(uri);
    } catch (error) {
        console.error("Erreur lors de la connexion à MongoDB", error);
    }
}
