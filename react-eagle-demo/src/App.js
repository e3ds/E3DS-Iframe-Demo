import { useRef } from 'react';
import './App.css';
import { commands } from './utils';
import Logo from './Unreal_Logo.png';

function App() {
  const iframeElem = useRef();

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
      <div>
        <div style={{ background: 'black', textAlign: 'center' }}>
          <img
            style={{ width: '50px', height: '50px' }}
            src={Logo}
            alt='logo'
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '10px',
          }}
        >
          {commands.map((item) => (
            <button
              style={{
                background: 'white',
                outline: 'none',
                border: '1px solid gray',
                fontSize: '17px',
                cursor: 'pointer',
                padding: '6px',
              }}
              onClick={() => switchTo(item.value)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: '100vh', width: '100%' }}>
        <iframe
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
