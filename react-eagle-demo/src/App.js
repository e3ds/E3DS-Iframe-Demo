import { useRef, useState } from 'react';
import './App.css';
import { commands } from './utils';
import {
  BsFillArrowLeftCircleFill,
  BsFillArrowRightCircleFill,
} from 'react-icons/bs';

function App() {
  const iframeElem = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const [cmd, setCmd] = useState('');

  const sendToMainPage = (obj) => {
    let origin = '*';
    console.log(iframeElem);
    if (null !== iframeElem.current) {
      iframeElem.current.contentWindow.postMessage(JSON.stringify(obj), origin);
    }
  };

  function switchTo(val) {
    let descriptor = {
      Teleport: val,
    };
    let obj = {
      cmd: 'sendToUe4',
      value: descriptor,
    };
    sendToMainPage(obj);
  }

  return (
    <div style={{ display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
        }}
      >
        <div style={{ display: isOpen ? 'block' : 'none' }}>
          <div style={{ textAlign: 'center', margin: '10px' }}>
            <img
              style={{ width: '70px', height: '70px' }}
              src='https://eagle3dstreaming.com/wp-content/uploads/2021/04/eagle3d-logo.png'
              alt='logo'
            />
          </div>
          <p
            style={{ textAlign: 'center', fontSize: '14px', fontWeight: '600' }}
          >
            Explore Commands:
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              padding: '10px',
              width: '250px',
            }}
          >
            {commands.map((item) => (
              <button
                style={{
                  outline: 'none',
                  border: 'none',
                  fontSize: '15px',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: cmd === item.value ? 'black' : 'rgb(221 222 224)',
                  color: cmd === item.value ? 'white' : 'black',
                  fontWeight: '600',
                  borderRadius: '20px',
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

        <div
          style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            fontSize: '40px',
            color: 'rgb(221 222 224)',
            cursor: 'pointer',
            border: 'none',
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <BsFillArrowRightCircleFill />
          ) : (
            <BsFillArrowLeftCircleFill />
          )}
        </div>
      </div>

      <div style={{ height: '100vh', width: '100%' }}>
        <iframe
          style={{ border: 'none' }}
          ref={iframeElem}
          title='demo'
          allow='camera;microphone'
          id='iframe_1'
          src='https://connector.eagle3dstreaming.com/v5/demo/FeaturesTemplate/E3DS-Iframe-Demo'
          width='100%'
          height='100%'
          allowfullscreen
        ></iframe>
      </div>
    </div>
  );
}

export default App;
