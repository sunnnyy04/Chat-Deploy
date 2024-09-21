import React, { useContext, useState } from 'react';
import axios from 'axios';
import { userContext } from './UserContext';

export default function RegisterAndLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { setUsername: setLoggedInUsername, setId } = useContext(userContext);
    const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
    const url=isLoginOrRegister==="register"?"/register":"/login";
    async function handleSubmit(e) {
        e.preventDefault();
        const { data } = await axios.post(url, { username, password });
        setLoggedInUsername(username);
        setId(data._id);
        console.log(data);
    }

    return (
        <div className='bg-blue-50 h-screen flex items-center'>
            <form onSubmit={handleSubmit} className='w-64 mx-auto mb-12'>
                <input 
                    value={username} 
                    onChange={ev => setUsername(ev.target.value)} 
                    type='text' 
                    placeholder='username'
                    className='block w-full rounded-sm p-2 mb-2 border' 
                />
                <input 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    type='password' 
                    placeholder='password' 
                    className='block w-full rounded-sm p-2 mb-2 border' 
                />
                <button className='bg-blue-500 text-white block w-full rounded-sm'>
                    {isLoginOrRegister === "register" ? "Register" : "Login"}
                </button>
                <div className='text-center mt-2'>
                    {isLoginOrRegister === "register" ? "Already a member?" : "New here?"} 
                    <a 
                        href='' 
                        onClick={(e) => {
                            e.preventDefault(); 
                            setIsLoginOrRegister(isLoginOrRegister === 'register' ? 'login' : 'register');
                        }}
                        className='text-blue-500'
                    >
                        {isLoginOrRegister === "register" ? " Login Here" : " Register Here"}
                    </a>
                </div>
            </form>
        </div>
    );
}

