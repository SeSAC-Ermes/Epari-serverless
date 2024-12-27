import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function D3Editor({ onChange }) {
  const svgRef = useRef(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [canvas, setCanvas] = useState({
    width: 1000,
    height: 600,
    background: '#ffffff'
  });

  // 샘플 에셋들 (AWS 아이콘들을 로컬에서 불러옴)
  const assets = [
    { id: 'athena', path: '/icons/AWS/Analytics/Athena.svg' },
    { id: 'emr', path: '/icons/AWS/Analytics/EMR.svg' },
    { id: 'glue', path: '/icons/AWS/Analytics/Glue.svg' }
  ];

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // 캔버스 초기화
    svg.selectAll("*").remove();

    // 드래그 기능
    const drag = d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded);

    // 배경 설정
    svg.append("rect")
        .attr("width", canvas.width)
        .attr("height", canvas.height)
        .attr("fill", canvas.background);

    // 에셋 그리기
    if (selectedAsset) {
      const g = svg.append("g")
          .attr("transform", `translate(100,100)`);

      g.append("image")
          .attr("href", selectedAsset.path)
          .attr("width", 80)
          .attr("height", 80);

      g.call(drag);
    }
  }, [selectedAsset, canvas]);

  const dragStarted = (event, d) => {
    d3.select(event.sourceEvent.target.parentNode)
        .raise()
        .classed("active", true);
  };

  const dragged = (event, d) => {
    d3.select(event.sourceEvent.target.parentNode)
        .attr("transform", `translate(${event.x},${event.y})`);
  };

  const dragEnded = (event, d) => {
    d3.select(event.sourceEvent.target.parentNode)
        .classed("active", false);
  };

  return (
      <div className="flex h-[600px]">
        {/* 에셋 사이드바 */}
        <div className="w-20 border-r p-2 overflow-y-auto">
          {assets.map(asset => (
              <div
                  key={asset.id}
                  className="mb-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                  onClick={() => setSelectedAsset(asset)}
              >
                <img src={asset.path} alt={asset.id} className="w-full"/>
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
