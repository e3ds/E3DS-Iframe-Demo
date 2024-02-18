import {
  AiOutlineLink,
  AiOutlineMail,
  AiOutlineUser,
  AiFillAudio,
} from 'react-icons/ai';
import { FiPhoneCall } from 'react-icons/fi';
import {
  BsKeyboard,
  BsFillCameraVideoFill,
  BsFillMouse2Fill,
  BsCommand,
} from 'react-icons/bs';
import { MdTimer, MdDevices } from 'react-icons/md';
import { FaDirections } from 'react-icons/fa';

export const commands = [
  {
    name: 'Open URL',
    value: '2',
    icon: <AiOutlineLink />,
  },
  {
    name: 'Open Mail App',
    value: '3',
    icon: <AiOutlineMail />,
  },

  {
    name: 'Open Call',
    value: '4',
    icon: <FiPhoneCall />,
  },
  // {
  //   name: 'Open Keyboard',
  //   value: '4',
  //   icon: <BsKeyboard />,
  // },
  {
    name: 'Toggle Browser Mouse',
    value: '6',
    icon: <BsFillMouse2Fill />,
  },
  {
    name: 'Increase Session Timer',
    value: '7',
    icon: <MdTimer />,
  },

  {
    name: 'Get User Info',
    value: '8',
    icon: <AiOutlineUser />,
  },
  {
    name: 'Get User Device Info',
    value: '9',
    icon: <MdDevices />,
  },
  {
    name: 'Video Player',
    value: '10',
    icon: <BsFillCameraVideoFill />,
  },
  {
    name: 'Audio Player',
    value: '11',
    icon: <AiFillAudio />,
  },
  {
    name: 'Command Line Argument',
    value: '12',
    icon: <BsCommand />,
  },
  {
    name: 'Redirect URL',
    value: '16',
    icon: <FaDirections />,
  },
];
