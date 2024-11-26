import './App.css'
import { Cards } from './Cards'
import { doSignOut, doSignInWithGoogle } from './firebase/auth'
import { useAuth } from './contexts/authContext'
import { useState } from 'react'

function App() {

  const { currentUser, userLoggedIn } = useAuth()
  const [isSigningIn, setIsSgningIn] = useState(false)

  const doGoogleSignIn = (e) => {
    e.preventDefault()
    if (!isSigningIn) {
      setIsSgningIn(true)
      doSignInWithGoogle().catch(err => {
        setIsSgningIn(false);
      })
    }
  }

  return (
    <div>
      {!userLoggedIn &&
        <div className="login">
          <h2>Hey Login to your account to see your saved articles, papers at one place..</h2>
          <button onClick={doGoogleSignIn}>Login</button>
        </div>}
      {userLoggedIn &&
        <div style={{ background: "white", padding: "1rem", borderRadius:"1rem" }}>
          <div className="header">
            <h2>Hello {currentUser.displayName}</h2>
            <button onClick={doSignOut}>Logout</button>
          </div>
          <Cards />
        </div>}
    </div>
  )
}

export default App
