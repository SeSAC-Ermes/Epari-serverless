import { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import athenaIcon from '../../assets/Athena.svg';
import emrIcon from '../../assets/EMR.svg';
import glueIcon from '../../assets/Glue.svg';

function D3Editor({ onChange }) {
  const svgRef = useRef(null);
  const [placedAssets, setPlacedAssets] = useState([]);
  const [canvas, setCanvas] = useState({
    width: 1000,
    height: 600,
    background: '#ffffff'
  });

  // 사이드바의 에셋 목록
  const assetList = [
    { id: 'athena', path: athenaIcon },
    { id: 'emr', path: emrIcon },
    { id: 'glue', path: glueIcon }
  ];

  // 드래그 이벤트 핸들러들
  const dragStarted = (event, d) => {
    d3.select(event.sourceEvent.target.parentNode)
      .raise()
      .classed("active", true);
  };

  const dragged = (event, d) => {
    const currentElement = d3.select(event.sourceEvent.target.parentNode);
    currentElement.attr("transform", `translate(${event.x},${event.y})`);
  };

  const dragEnded = (event, d) => {
    const currentElement = d3.select(event.sourceEvent.target.parentNode);
    const transform = currentElement.attr("transform");
    const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
    const x = parseFloat(translate[1]);
    const y = parseFloat(translate[2]);

    // 위치 정보 업데이트
    setPlacedAssets(prev => prev.map(asset => {
      if (asset.id === d.id) {
        return { ...asset, x, y };
      }
      return asset;
    }));

    currentElement.classed("active", false);
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    
    // 캔버스 초기화
    svg.selectAll("*").remove();
    
    // 배경 설정
    svg.append("rect")
      .attr("width", canvas.width)
      .attr("height", canvas.height)
      .attr("fill", canvas.background)
      .style("pointer-events", "none");

    // 모든 에셋 그리기
    placedAssets.forEach((asset) => {
      const g = svg.append("g")
        .datum(asset)  // 데이터 바인딩
        .attr("class", "draggable")
        .attr("transform", `translate(${asset.x || 100},${asset.y || 100})`);

      g.append("image")
        .attr("href", asset.path)
        .attr("width", 80)
        .attr("height", 80);

      // 드래그 기능
      const drag = d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded);

      g.call(drag);
    });
  }, [placedAssets, canvas]);

  // 아이콘 클릭 시 새로운 아이콘 추가
  const handleAssetClick = (asset) => {
    setPlacedAssets(prev => [...prev, { 
      ...asset, 
      id: `${asset.id}_${Date.now()}`,
      x: 100,  // 초기 x 위치
      y: 100   // 초기 y 위치
    }]);
  };

  return (
    <div className="flex h-[600px]">
      {/* 에셋 사이드바 */}
      <div className="w-20 border-r p-2 overflow-y-auto">
        {assetList.map(asset => (
          <div
            key={asset.id}
            className="mb-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
            onClick={() => handleAssetClick(asset)}
          >
            <img src={asset.path} alt={asset.id} className="w-full" />
          </div>
        ))}
      </div>

      {/* 캔버스 */}
      <div className="flex-1 relative bg-gray-50">
        <svg
          ref={svgRef}
          width={canvas.width}
          height={canvas.height}
          className="border rounded shadow-sm"
        />
      </div>
    </div>
  );
}

export default D3Editor; 