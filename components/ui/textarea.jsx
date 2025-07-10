import React from 'react';

const Textarea = ({ value, onChange, placeholder }) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full p-2 border border-gray-300 rounded-md bg-[#1f1f1f] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      rows={4}
    />
  );
};

export default Textarea;
