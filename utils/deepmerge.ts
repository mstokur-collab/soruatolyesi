// Simple deep merge utility for merging curriculum data.
export const deepmerge = (target: any, source: any) => {
    const output = { ...target };
  
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = deepmerge(target[key], source[key]);
        } else if (Array.isArray(source[key])) {
          // In our curriculum, arrays should be concatenated and duplicates removed if necessary
          const targetArray = target[key] || [];
          const sourceArray = source[key];
          // A simple concatenation, assuming no complex object merging in arrays is needed for curriculum
          output[key] = [...targetArray, ...sourceArray]; 
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
  
    return output;
  };
  
  const isObject = (item: any) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
  };
  