import React, { useState } from 'react'
import './index.css'

export const Card = ({ cardDetail = {
  url: "URL",
  original: "Originial Text",
  summarize: "Summarized Text",
  translate: "Translated Text",
  simplify: "Simplified Text"
} }) => {
  const [active, setActive] = useState(0);

  return (
    <div className="card-container">
      <a href={cardDetail.url} target='_blank'>{cardDetail.url}</a>
      <div>
        <button disabled={active === 0} onClick={() => setActive(0)}>Original Text</button>
        <button disabled={active === 1} onClick={() => setActive(1)}>Summarized Text</button>
        <button disabled={active === 2} onClick={() => setActive(2)}>Translated Text</button>
        <button disabled={active === 3} onClick={() => setActive(3)}>Simplified Text</button>
      </div>
      <div className="text">
        {active === 0 && <p>{cardDetail.original}</p>}
        {active === 1 && <p>{cardDetail.summarize}</p>}
        {active === 2 && <p>{cardDetail.translate}</p>}
        {active === 3 && <p>{cardDetail.simplify}</p>}
      </div>
    </div>
  )
}