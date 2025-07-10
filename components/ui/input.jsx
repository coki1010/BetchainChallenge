import React from 'react';

const Input = ({ type = "text", value, onChange, placeholder }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full p-2 border border-gray-300 rounded-md bg-[#1f1f1f] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};

export default Input;
