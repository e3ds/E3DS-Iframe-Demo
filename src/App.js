import { useEffect, useRef, useState } from 'react';
import './App.css';
import { commands } from './utils';
import {
  BsFillArrowLeftCircleFill,
  BsFillArrowRightCircleFill,
} from 'react-icons/bs';
import { FiSettings } from 'react-icons/fi';
import { messageHandler } from './utils/demo';
import { eventHandler } from './utils/message';
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

  function hideSettings(id){
    let descriptor = {
      id,
      property: 'display',
      value: 'none'
    }

    let obj = {
      cmd: 'style',
      value: descriptor,
    }
    sendToMainPage(obj);
  }

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
  useEffect(()=>{
    window.e3ds = {
      // list of event listeners
      events: {},
      onEvent(eventName, callback){
        this.events[eventName] = callback;
      }
    };

    window.addEventListener('message', messageHandler);
    window.addEventListener('message', eventHandler);
    
  },[])
  window?.e3ds?.onEvent("increaseSessionExpireTime", (data) => {
    alert("Increasing session expire time");
  
  });
  return (
    <div style={{ display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          borderRight: '1px solid #e3e3e3',
          background: '#ececec',
        }}
      >
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

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              padding: '10px',
              width: '250px',
              marginTop: '20px',
            }}
          >
            {commands.map((item, i) => (
              <button
                key={i}
                className='cmd-btn'
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
            <button
                className='cmd-btn'
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
                  background:'rgb(221 222 224)',
                  color: 'black',
                  fontWeight: '600',
                  borderRadius: '20px',
                }}
                onClick={() => {
                  hideSettings('e3ds_control_toggle_Obj');
                }}
              >
                <span style={{ fontSize: '17px' }}><FiSettings/></span>{' '}
                <span>Hide Settings</span>
              </button>
          </div>
        </div>

        <div
          className='left-right-arrow'
          style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            fontSize: '40px',
            color: 'rgb(221 222 224)',
            cursor: 'pointer',
            border: 'none',
          }}
          onClick={() => {
            setIsOpen(!isOpen)
            const iframe = document.getElementById('iframe_1');
            iframe.contentWindow.focus();
          }}
        >
          {isOpen ? (
            <BsFillArrowLeftCircleFill />
          ) : (
            <BsFillArrowRightCircleFill />
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
          //src='https://localhost:55555/testToken'
          src='https://connector.eagle3dstreaming.com/v5/demo/E3DSFeaturesTemplate/E3DS-Iframe-Demo'
          width='100%'
          height='100%'
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}

export default App;
