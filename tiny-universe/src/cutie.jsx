import {useState} from 'react';

function Universe(){
    return(
        <>
        <h2>You have entered into universe!</h2>
        </>
    )
}

function Landing({setIsEntered}){
    return(
        <>
        <h1>Hi there</h1>
        <button onClick={()=>props.setIsEntered(true)}>Enter Universe</button>
        </>
    )
}

function cutie(){
    const[isEntered,setIsEntered] = useState(false);
    return(
        <>
          {isEntered? <Universe/> : <Landing setIsEntered={setIsEntered}/>}
        </>
    )
}

<div className="moon-phases">
   {moonPhases.map((phase)=>{
    <div className='moon-phase'>
        <div>{phase.name}</div>
        <div>{phase.moon}</div>
        <div className='fact'>{phase.fact}</div>
    </div>
   })}
</div>