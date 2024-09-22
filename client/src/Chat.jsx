import React, { useContext, useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Logo from './Logo';
import { userContext } from './UserContext';
import uniqBy from "lodash.uniqby"
import axios from 'axios';
import Contact from './Contacts';


function Chat() {
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople]  = useState({});

  const [ws, setWs] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [messages, setMessages] = useState([]); // New state to track messages
  const { username, id ,setId,setUsername} = useContext(userContext);
  const divUnderMessages=useRef();


  useEffect(() => {
    connectToWs();
  }, []);
  function connectToWs(){
    const ws = new WebSocket('ws://chat-deploy-api.vercel.app');
    setWs(ws);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('close', () =>{
      setTimeout(()=>{
        console.log('disconnected trying to reconnect')
      connectToWs()
    });
      },1000)
    ws.addEventListener('error', () => console.log('WebSocket error'));
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ username, userId }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }
  function logout() {
    axios.post('/logout').then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  function handleMessage(e) {
    const messagesData = JSON.parse(e.data);
    console.log(e,messagesData);
    if ('online' in messagesData) {
      showOnlinePeople(messagesData.online);
    } else if("text" in messagesData) {
      console.log(messagesData.text);
      
      setMessages(prev => [...prev, {...messagesData}]); // Add new message to state
    }
  }

  function selectContact(selectedUserId) {
    setSelectedUserId(selectedUserId);
  }

  function sendMessage(e) {
    e.preventDefault();
    if (ws && selectedUserId) {
      ws.send(JSON.stringify({
        message: {
          recipient: selectedUserId,
          text: newMessageText
        }
      }));
      setMessages(prev => [...prev, { sender:id, text: newMessageText,recipient:selectedUserId,_id:Date.now()}]); // Show your own message
      
      setNewMessageText(''); // Clear the message input after sending
    }
  }
  useEffect(()=>{
    const div=divUnderMessages.current;
    if(div){
      div.scrollIntoView({behavior:'smooth',});
    }
  },[messages]);


  useEffect(() => {
    axios.get('/people')
      .then((res) => {
        const offlinePeopleArr = res.data.users
          .filter(p => p._id !== id)
          .filter(p => !Object.keys(onlinePeople).includes(p._id)); // Fix the filtering condition
  
        const offlinePeople = {};
        offlinePeopleArr.forEach(p => {
          offlinePeople[p._id] = p;
        });
        setOfflinePeople(offlinePeople);
        console.log(offlinePeople)
        console.log(onlinePeopleExclOurUser);
        
      })
      .catch(err => {
        console.error("Error fetching people:", err);
      });
  }, [offlinePeople]); // Ensure `id` is a dependency if used in filtering
  

  useEffect(()=>{
    if(selectedUserId){
      axios.get('/messages/'+selectedUserId).then(res=>{
        setMessages(res.data);
        console.log(messages)
      })
    }
  },[selectedUserId])

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];
  const messageWithoutDupes=uniqBy(messages,'_id');
  console.log(messageWithoutDupes);
  console.log(messages)
  
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col flex-grow">
      <div className='flex-grow'>
      <Logo />
        {Object.keys(onlinePeopleExclOurUser).map(userId => (
          <Contact key={userId} id={userId} username={onlinePeople[userId]} onClick={() => selectContact(userId)} selected={userId === selectedUserId} online={true}/>
        ))}
        {Object.keys(offlinePeople).map(userId=>(
          <Contact key={userId} id={userId} username={offlinePeople[userId].username} onClick={()=>selectContact(userId)} selected={userId===selectedUserId} online={false}/>

        ))}
      </div>
        <div className=' flex justify-center '>
          <span>welcome {username}</span>
        <button
            onClick={logout}
            className="text-sm h-12 bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm ">logout</button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-300 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex items-center justify-center w-full h-full">
              <div className="h-16">No Selected Person</div>
            </div>
          )}
          {!!selectedUserId && (
            <div className='relative h-full'>
            <div  className="flex-grow overflow-y-auto absolute inset-0">
              {messageWithoutDupes.map((message) => (
            <div key={message._id} className={(message.sender === id) ? 'text-right' : 'text-left'}>
            <div className={`inline-block p-2 my-2 rounded-sm text-sm ${message.sender === id ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}>
            {message.sender === id ? 'ME: ' : ''}{message.text}
            </div>
            </div>
            ))}
            <div ref={divUnderMessages}></div>
            </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form onSubmit={sendMessage} className="flex gap-2 mx-2">
            <input
              type="text"
              className="bg-white border p-2 flex-grow rounded-sm"
              placeholder="Type your message here"
              value={newMessageText}
              onChange={e => setNewMessageText(e.target.value)}
            />
            <button type="submit" className="bg-blue-500 p-2 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0 1 21.485 12a59.768 59.768 0 0 1-18.215 8.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Chat;
