import {useState , useEffect} from 'react';
import './App.css'
import MusicPlayer from './MusicPlayer';

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
  const[showShootingStar,setShowShootingStar]=useState(false);

  const[wishMade,setWishMade] = useState(false);

  useEffect(()=>{
    const timer = setInterval(()=>{
      setShowShootingStar(true) 
    } , 5000);

    return () => clearTimeout(timer);
    // setTimeout sets a timer in the browser, so by writing this we are cleaning up that.
  } , [showShootingStar]);


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

  const moonPhases = [
    {
      name: "New Moon",
      moon: "new",
      "moonFacts": [
      "A new moon occurs when the Moon is between Earth and the Sun.",
      "The side of the Moon facing Earth is not illuminated, making it nearly invisible in the sky.",
      "New moons are the best time for stargazing since there's no moonlight to wash out fainter stars.",
      "A solar eclipse can only happen during a new moon."
    ]
    },
    {
      name: "Waxing Crescent",
      moon: "wax-cre",
      "moonFacts": [
      "The illuminated portion slowly grows each night.",
      "\"Waxing\" means growing or increasing in visible size.",
      "A crescent shape appears on the right side in the Northern Hemisphere.",
      "This phase typically appears within a few days after the new moon."
    ]
    },
    {
      name: "First Quarter",
      moon: "first-quar",
      "moonFacts": [
      "Exactly half of the Moon's face is illuminated, and it grows fuller each night.",
      "It's called 'first quarter' because the Moon has completed a quarter of its orbit around Earth.",
      "Despite the half-lit appearance, this phase is often just called a 'half moon.'",
      "The first quarter moon rises around noon and sets around midnight."
    ]
    },
    {
      name: "Waxing Gibbous",
      moon: "wax-gib",
      "moonFacts": [
      "More than half of the Moon is illuminated as it approaches the full moon.",
      "\"Gibbous\" comes from a Latin word meaning 'hump-backed' or 'humped.'",
      "This phase occurs between the first quarter and the full moon.",
      "The Moon rises later each day during this phase, in the late afternoon or evening."
    ]
    } ,
    {
      name: "Full Moon",
      moon: "full-moon",
      moonFacts: [
    "A full moon occurs when Earth is between the Sun and the Moon.",
    "The entire side of the Moon facing Earth is illuminated.",
    "A full moon rises around sunset and sets around sunrise.",
    "The Moon is not actually producing its own light — it reflects sunlight."
      ]
    },
    {
      name: "Waning Gibbous",
      moon: "wan-gib",
      moonFacts: [
    "The illuminated portion begins to decrease after the full moon.",
    "\"Waning\" means becoming smaller or less.",
    "This phase occurs between the full moon and third quarter.",
    "A waning gibbous moon rises later in the evening."
    ]
  },
  {
      name: "Third Quarter",
      moon: "third-quar",
      moonFacts: [
    "Half of the Moon is illuminated during the third quarter.",
    "It is also called the last quarter moon.",
    "The Moon is three-quarters of the way through its lunar cycle.",
    "It rises around midnight and sets around noon."
    ]
  },
  {
      name: "Waning Crescent",
      moon: "wan-cre",
      moonFacts: [
    "Only a small portion of the Moon remains illuminated.",
    "This phase occurs just before the new moon.",
    "The illuminated portion continues shrinking each night.",
    "A waning crescent is best seen shortly before sunrise."
      ]
    }
  ];

  return(
    <div className='universe'>
      <MusicPlayer />
      {/* rendered music player */}
      {stars.map((_,index) => (
        <div 
          className='star' 
          key={index}
          style={{
            left: `${Math.random()*100}%` ,
            top: `${Math.random()*100}%`
          }}
        > *
          <div className='star-fact'>{facts[Math.floor(Math.random()*facts.length)]}
          </div>
        </div>
      ))}

      {/* writing phase inside bracket means that ,hey .map() , give me each item in moonPhases and while you are trying to access them , call each of them with name-phase */}

    <div className='moon'></div>

    <div className='shooting-star-hitbox'>
      {showShootingStar && (
      <div 
        className='shooting-star' 
        onClick={()=>setWishMade(true)}
        onAnimationEnd={()=>setShowShootingStar(false)}
        // When the CSS animation on this element finishes, run this function.
        >
        {/* <span>Make a wish <i className='wish-star'></i></span> */}
      </div>
      )
      }
    </div>

    {/* only create the shooting-star div if showShooting is true */}

    
    <div className='moon-phases'>
      {moonPhases.map((phase , index)=> (
        <div className='moon-phase' key={index}>
          <div className={`phase-moon ${phase.moon}`}></div>
          <div className='phase-name'>{phase.name}</div>
          <div className='fact'>{phase.moonFacts[Math.floor(Math.random()*phase.moonFacts.length)]}</div>
       </div>
    ))}
    </div>
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
    // this <></> is called fragments
  )
}

export default App;

