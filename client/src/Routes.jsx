import React from 'react'
import RegisterAndLogin from './Register'
import { useContext } from 'react'
import { userContext } from './UserContext'
import Chat from './Chat'

function Routes() {
    const {username,id}=useContext(userContext)
    if(username){
        return <Chat/>;
    }
  return (
    <RegisterAndLogin/>
  )
}

export default Routes