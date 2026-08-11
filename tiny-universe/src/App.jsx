import {useState} from 'react';
import './App.css'


function Landing({setIsEntered, setIsLeaving , isLeaving}){
  return(
    <div className={isLeaving ? 'leaving landing': 'landing'}>
      <p>WELCOME TO </p>
      <h1>Tiny Universe</h1>
      <h2>a little place for people who look up</h2>

      <button onClick={()=> {setIsLeaving(true) ,  setTimeout(() => {
        setIsEntered(true)
      }, 1000);}}>Enter Universe</button>
    </div>
  )
}
// State lives in the parent, but the child can change it through a function passed as a prop.
// This is called lifting state up / passing callbacks, and you'll use it constantly in React.

function Universe(isEntered){
  const facts =[
    "The nearest star to Earth (other than the Sun) is Proxima Centauri, 4.24 light-years away." ,
    "The Sun makes up about 99.86% of the mass in our solar system." ,
    "Stars are born in nebulae — vast clouds of gas and dust." ,
    "The largest known star, Stephenson 2-18, has a radius over 2,000 times that of the Sun." ,
    "The most massive stars live only a few million years before exploding as supernovae." , 
    "Smaller stars, like red dwarfs, can live for trillions of years." , 
    "Neutron stars are so dense that a teaspoon of their material would weigh about a billion tons." , 
    "A single teaspoon of a white dwarf star would weigh about 5.5 tons." , 
    "Some stars, called pulsars, spin hundreds of times per second and emit beams of radiation." ,
    "Betelgeuse, a red supergiant, is expected to explode as a supernova sometime in the next 100,000 years." ,
    "Most stars in the universe exist in binary or multiple-star systems." ,
    "Stars produce energy through nuclear fusion, converting hydrogen into helium." ,
    "The Sun converts about 600 million tons of hydrogen into helium every second."
  ]
  const stars = Array.from({length : 30});
  // give me an array with 30 empty slots

  const randomFact = facts[Math.floor(Math.random()*facts.length)]

  // Math.random - gives any decimal value b/w 0 and 1.
  return(
    // <div className='star'>
    //   *
    //   <div className='star-fact'>
    //     {randomFact}
    //   </div>
    // </div>
    <div className={isEntered?'universe entered':'universe'}>
      <div className='sky'></div>

      {stars.map((_, index) => {
        const x = Math.random() * 100
        const y = Math.random() * 100

      return (
        <div
          className="star"
          key={index}
          style={{
            left: `${x}%`,
            top: `${y}%`
          }}
          >
      *
      <div className="star-fact">
        {facts[Math.floor(Math.random() * facts.length)]}
      </div>
    </div>
  )
})}

      <div className='moon'></div>
    </div>
  )
}

function App() {
  const[isEntered,setIsEntered] = useState(false);
  const[isLeaving,setIsLeaving] = useState(false);
  // react create a piece of information called as isEntered , and initially make it false.
  return(
    <>
      {isEntered ? <Universe/> : <Landing setIsEntered={setIsEntered} isLeaving={isLeaving}setIsLeaving={setIsLeaving}/> }
    </>
    // this <> </> is called fragments
  )
}

export default App;