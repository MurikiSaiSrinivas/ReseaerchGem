import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";


// export const fetchCards = async (userId) => {
//     try {
//         const q = query(
//             collection(db, "ResearchGem"), 
//             where("userId", "==", userId) 
//         );

//         const querySnapshot = await getDocs(q);
//         const userCards = querySnapshot.docs.map((doc) => doc.data().cards);
//         console.log(userCards.flat());
//     } catch (error) {
//         console.error( error);
//     }
// };

export const fetchCards = async (userId) => {
    try {
        const q = query(
            collection(db, "ResearchGem"), // Replace with your collection name
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const userCards = querySnapshot.docs.map((doc) => doc.data().cards);
        return userCards.flat(); // Return the flattened array of cards
    } catch (error) {
        console.error("Error fetching cards: ", error);
        throw error; // Re-throw the error for handling in the calling component
    }
};
