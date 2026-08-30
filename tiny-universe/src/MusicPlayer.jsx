import {useState,useRef} from 'react';
import songs from './songs'

function MusicPlayer() {
    const audioRef = useRef(null);
    // why we put useRef as null
    // because it says, currently i don;t hv the DOM element yet(<audio></audio>). Once React creates it,Put the ref here.

    const[currentSong,setCurrentSong] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        if(isPlaying){
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return(
        <div className='musicPlayer'>
            <div className='title'>
                {songs[currentSong].title};
            </div>

            <div className='artist'>
                {songs[currentSong].artist};
            </div>

            {/* <div className='song'>
                {songs[currentSong].url};
            </div> */ }
            {/* audio files stay inside audio tag */}
{/* 
            <button onClick={togglePlay}>
                {isPlaying ? "Pause" : "Play"};
            </button> */}

            <button onClick={() => togglePlay}>{isPlaying ? "Pause" : "Play"}
            </button>

            <audio 
                ref={audioRef} 
                src={songs[currentSong].url}
                controls>
            </audio>

            {/* by writing this , think of that as
            React , put an audio player here , but we should be able to tell that specific auio element to :-
            PLAY
            PAUSE
            CHANGE VOLUME
            etc. */}

            {/* useRef helps us to give ref. to something
            in our case , it is audioRef.
            audioRef
              ↓
            <audio> element

            using this we can later say audioRef.current or js can tell that particular element audioRef.current.play() or audioRef.current.pause()
            */
            
            }


        </div>
    )
}
export default MusicPlayer;










