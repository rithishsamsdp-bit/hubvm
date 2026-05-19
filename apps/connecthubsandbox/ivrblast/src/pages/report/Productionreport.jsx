import React from 'react'
import { useSelector } from 'react-redux';

const Productionreport = () => {


  const token = useSelector((state) => state.tokenInfo.token);
  console.log(token);
  return (
    <div>
      Productionreport
    </div>
  )
}

export default Productionreport
