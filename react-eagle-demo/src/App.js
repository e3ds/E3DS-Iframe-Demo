import { useRef, useState } from 'react';
import './App.css';
import { commands } from './utils';
import {
  BsFillArrowLeftCircleFill,
  BsFillArrowRightCircleFill,
} from 'react-icons/bs';

function App() {
  // create ref for iframe
  const iframeElem = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const [cmd, setCmd] = useState('');

  // send command to unreal engine
  function switchTo(val) {
    let obj = {
      cmd: 'sendToUe4',
      value: {
        Teleport: val,
      },
    };

    let origin = '*';

    if (null !== iframeElem.current) {
      iframeElem.current.contentWindow.postMessage(JSON.stringify(obj), origin);
    }
  }

  return (
    <div style={{ display: 'flex', overflow: 'hidden', position:'relative' }}>
      <div
      className='sidebar-container'
      >
        <div style={{height:'86vh'}}>
          <div
          style={{
            display: isOpen ? 'block' : 'none',
          }}
        >
          <div style={{ textAlign: 'center', margin: '10px' }}>
            <img
              style={{ width: '70px', height: '70px' }}
              src='https://eagle3dstreaming.com/wp-content/uploads/2021/04/eagle3d-logo.png'
              alt='logo'
            />
          </div>

          <div className='cmd-container'>
            {commands.map((item) => (
              <button
                className='cmd-btn'
                style={{
                  background: cmd === item.value ? 'black' : 'rgb(221 222 224)',
                  color: cmd === item.value ? 'white' : 'black',
                }}
                onClick={() => {
                  setCmd(item.value);
                  switchTo(item.value);
                }}
              >
                <span style={{ fontSize: '17px' }}>{item.icon}</span>{' '}
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className='left-right-arrow' onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? (
                      <BsFillArrowLeftCircleFill />
          ) : (
              <BsFillArrowRightCircleFill />
          )}
        </div>
        </div>
     
      </div>

      <div style={{ height: '100vh', width: '100vw' }}>
        <iframe
          style={{ border: 'none' }}
          ref={iframeElem}
          title='demo'
          allow='camera;microphone'
          id='iframe_1'
          src='https://connector.eagle3dstreaming.com/v5/demo/E3DSFeaturesTemplate/E3DS-Iframe-Demo'
          width='100%'
          height='100%'
          allowfullscreen
        ></iframe>
      </div>
    </div>
  );
}

export default App;
