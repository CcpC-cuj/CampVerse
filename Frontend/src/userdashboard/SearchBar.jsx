import React, { useState, useEffect } from "react";
import { Search } from "lucide-react"; // search icon

const SearchBar = ({ placeholder, value, onChange, onResults }) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!localValue.trim()) {
        setMessage("");
        onResults?.([]);
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const res = await fetch(`/api/events?search=${localValue}`);
        const data = await res.json();
        const events = data.events || [];

        if (events.length === 0) {
          setMessage(`No results found for "${localValue}"`);
        }

        onResults?.(events);
      } catch (err) {
        setMessage("Something went wrong.");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [localValue]);

  return (
    <div className="w-full flex flex-col">
      {/* Input box with responsive sizing */}
      <div className="relative w-full">
        <input
          type="text"
          className="
            w-full 
            px-3 sm:px-4 py-2 
            rounded-lg 
            bg-gray-700 text-white placeholder-gray-400 
            focus:outline-none 
            text-sm sm:text-base
          "
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange?.(e);
          }}
        />
        <Search
          className="
            absolute right-2 sm:right-3 
            top-1/2 transform -translate-y-1/2 
            w-4 h-4 sm:w-5 sm:h-5 
            text-gray-400
          "
        />
      </div>

      {/* Messages (below input) */}
      {loading && (
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-400">
          Searching...
        </p>
      )}
      {message && (
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
};

export default SearchBar;
