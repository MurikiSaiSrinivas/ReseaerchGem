import React, { useState, useEffect } from 'react'
import './index.css'
import { Card } from '../Card'
import { fetchCards } from '../firebase/db'
import { useAuth } from '../contexts/authContext'

export const Cards = () => {

    const [cards, setCards] = useState([]);
    const { currentUser } = useAuth()

    useEffect(() => {
        const loadCards = async () => {
            try {
                const userCards = await fetchCards(currentUser.uid);
                setCards(userCards);
                console.log(userCards)
            } catch (error) {
                console.error("Error fetching cards: ", error);
            }
        };

        loadCards();
    }, []);


    return (
        <div className="cards-container">
            {cards.length != 0 ? cards.map((card, index) => <Card cardDetail={{
                id: index,
                url: card.url,
                original: card.original,
                summarize: card.summarize ? card.summarize : "You didn't summarized this text",
                translate: card.translate ? card.translate : "You didn't Translated this text",
                simplify: card.simplify ? card.simplify : "You didn't Simplified this text"
            }} />)
            :
            <h1>There are no saved cards. Please add some cards</h1>
        }
        </div>
    )
}