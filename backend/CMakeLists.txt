cmake_minimum_required(VERSION 3.12)
project(dayflow CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/lib)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/lib/Crow/include)
include_directories("C:/msys64/ucrt64/include")

link_directories("C:/msys64/ucrt64/lib")

add_executable(dayflow
    src/main.cpp
    src/database.cpp
)

if(WIN32)
    target_compile_definitions(dayflow PRIVATE _WIN32_WINNT=0x0601)
    target_link_libraries(dayflow PRIVATE
        sqlite3
        ws2_32
        mswsock
    )
endif()