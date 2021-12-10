node {
    try {
        stage('Clone repo') {
            checkout scm
        }
        ebsi_deploy("clone_repo": false)
    } catch (e) {
        throw e
    } finally {
        cleanWs()
        dir("${env.WORKSPACE}@script") {
            deleteDir()
        }
    }
}
