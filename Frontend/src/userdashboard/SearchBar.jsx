import React from "react";

const SearchBar = ({ placeholder = "Search...", onChange, value }) => {
  return (
    <div className="relative flex-1 min-w-[220px] max-w-xl">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <i className="ri-search-line text-gray-400 w-5 h-5" />
      </div>
      <input
        type="text"
        className="h-7 bg-gray-800/60 border-none text-sm rounded-xl block w-full pl-11 pr-3 text-white placeholder-gray-400  outline-none"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default SearchBar;
